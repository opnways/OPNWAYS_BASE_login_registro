import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');
        const migrationFile = path.join(__dirname, '001_initial_schema.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

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
