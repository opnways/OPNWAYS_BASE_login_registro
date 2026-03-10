import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Crea la tabla de tracking si no existe y hace el bootstrap inicial:
 * si la tabla users ya existe y schema_migrations está vacía, marcamos
 * las migraciones anteriores como ya aplicadas sin re-ejecutarlas.
 */
async function ensureMigrationsTable(client, allMigrations) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   TEXT PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bootstrap: si la tabla usuarios ya existe (migraciones previas al tracking)
    // y schema_migrations está vacía, marcamos los archivos SQL existentes como
    // ya aplicados para no re-ejecutarlos.
    const countResult = await client.query('SELECT COUNT(*) FROM schema_migrations');
    const isEmpty = parseInt(countResult.rows[0].count, 10) === 0;

    if (isEmpty) {
        const usersExist = await client.query(`
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
        `);

        if (usersExist.rowCount > 0) {
            console.log('Existing database detected — bootstrapping migration tracking...');
            // Registrar como aplicadas las migraciones que ya están en disco
            // (excepto la última: la ejecutaremos ahora si no estaba aplicada)
            // Heurística: todos menos el último = ya estaban; el último se verifica.
            // Para mayor seguridad, marcamos todos los archivos "previos" al más nuevo.
            const previousMigrations = allMigrations.slice(0, -1);
            for (const file of previousMigrations) {
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                    [file]
                );
            }
            console.log(`  Marked as applied: ${previousMigrations.join(', ')}`);
        }
    }
}

/**
 * Devuelve el conjunto de nombres de archivo de las migraciones ya aplicadas.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<Set<string>>}
 */
async function getAppliedMigrations(client) {
    const result = await client.query('SELECT filename FROM schema_migrations');
    return new Set(result.rows.map(r => r.filename));
}

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');

        // Descubrir .sql del directorio, ordenados por nombre para ejecución secuencial.
        const allMigrations = fs.readdirSync(__dirname)
            .filter(f => f.endsWith('.sql'))
            .sort();

        await ensureMigrationsTable(client, allMigrations);
        const applied = await getAppliedMigrations(client);

        const pending = allMigrations.filter(f => !applied.has(f));

        if (pending.length === 0) {
            console.log('All migrations already applied. Nothing to do.');
            return;
        }

        for (const file of pending) {
            const migrationFile = path.join(__dirname, file);
            const sql = fs.readFileSync(migrationFile, 'utf8');

            console.log(`Applying migration: ${file}`);
            await client.query('BEGIN');
            await client.query(sql);
            await client.query(
                'INSERT INTO schema_migrations (filename) VALUES ($1)',
                [file]
            );
            await client.query('COMMIT');
            console.log(`  ✓ ${file}`);
        }

        console.log('Migrations completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error running migrations:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
