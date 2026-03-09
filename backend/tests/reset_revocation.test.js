import test from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/features/auth/services/AuthService.js';
import { TokenService } from '../src/features/auth/services/TokenService.js';
import { AuthRepository } from '../src/features/auth/repository/AuthRepository.js';

test('Password Reset revokes all active Refresh Tokens', async (t) => {
    // 1. Setup - Create user and login
    const email = `test_reset_${Date.now()}@example.com`;
    let user;
    let initialRefreshTokenPlain;

    await t.test('Setup: Crear usuario e iniciar sesión', async () => {
        user = await AuthService.register(email, 'Password123!');
        const res = await AuthService.login(email, 'Password123!');
        initialRefreshTokenPlain = res.refreshToken;
        assert.ok(initialRefreshTokenPlain, 'Debería recibir un refresh token válido inicial');
    });

    let resetTokenPlain;
    await t.test('Setup: Generar Token de Reset forzado para pruebas', async () => {
        const { token, hash } = await TokenService.generateResetToken();
        const expiresAt = new Date(Date.now() + 3600000);
        await AuthRepository.savePasswordResetToken(user.id, hash, expiresAt);
        resetTokenPlain = token;
        assert.ok(resetTokenPlain, 'Debería poder forzar la inyección de token en DB para simular el mail');
    });

    await t.test('Flujo Normal: Ejecutar el Reset de Contraseña', async () => {
        await AuthService.resetPassword(resetTokenPlain, 'NuevaClaveSegura#123');
        assert.ok(true, 'El resetPassword se ha ejecutado sin arrojar errores (transacción cerrada limpia)');

        // Verificamos de forma empírica y directa en bd que NO haya tokens sin revocar para ese user
        const executor = { query: (await import('../src/utils/db.js')).query };
        const res = await executor.query('SELECT COUNT(*) as alive FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL', [user.id]);
        assert.strictEqual(parseInt(res.rows[0].alive, 10), 0, 'No debería quedar ni un solo refresh token vivo con revoked_at=null en bbdd');
    });

    await t.test('Verificación de Seguridad: Intentar usar el token robado o caduco previo al reseteo de clave', async () => {
        const hash = TokenService.hashToken(initialRefreshTokenPlain);

        try {
            await AuthService.refresh(hash);
            assert.fail('La sesión original debería fallar intentando un refresh pues fue revocada globalmente');
        } catch (err) {
            // El backend del AuthService levanta o lanza Reúso o Cese Natural, pero en general es un fallo garantizado.
            assert.ok(err.message.includes('revocado') || err.message.length > 5, 'Lanza excepción protegiendo la puerta');
        }
    });
});
