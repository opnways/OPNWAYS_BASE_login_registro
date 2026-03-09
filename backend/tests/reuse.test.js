import test from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/features/auth/services/AuthService.js';
import { TokenService } from '../src/features/auth/services/TokenService.js';
import { AuthRepository } from '../src/features/auth/repository/AuthRepository.js';

test('Refresh Token Rotation and Reuse Detection', async (t) => {
    // 1. Crear un usuario de prueba directamente en DB
    const email = `test_reuse_${Date.now()}@example.com`;
    let user;
    let initialRefreshTokenPlain;

    await t.test('Setup: Crear usuario e iniciar sesión', async () => {
        user = await AuthService.register(email, 'Password123!');
        const res = await AuthService.login(email, 'Password123!');
        initialRefreshTokenPlain = res.refreshToken;
        assert.ok(initialRefreshTokenPlain, 'Debería recibir un refresh token válido inicial');
    });

    let secondRefreshTokenPlain;

    await t.test('Flujo Normal: Rotación exitosa de Refresh Token', async () => {
        // Ejecutamos el refresh simulando una visita legítima
        const hash = TokenService.hashToken(initialRefreshTokenPlain);
        const res = await AuthService.refresh(hash);

        secondRefreshTokenPlain = res.refreshToken;

        assert.ok(res.accessToken, 'Debería recibir un nuevo access token');
        assert.ok(secondRefreshTokenPlain, 'Debería recibir un nuevo refresh token');
        assert.notStrictEqual(initialRefreshTokenPlain, secondRefreshTokenPlain, 'Los tokens de refresco deben ser distintos');

        // Verificamos que el anterior quedó revocado y vinculado al nuevo
        const oldData = await AuthRepository.findRefreshTokenAllStates(hash);
        assert.ok(oldData.revoked_at, 'El token original debe estar marcado como revocado tras su uso');
        assert.ok(oldData.replaced_by, 'El token original debe apuntar al ID de su reemplazo (replaced_by)');
    });

    await t.test('Reuse Attack: Intentar re-usar el token antiguo ya revocado', async () => {
        // Simulamos que un atacante robó el `initialRefreshTokenPlain` y trata de usarlo (Ataque de Reúso)
        const hash = TokenService.hashToken(initialRefreshTokenPlain);

        try {
            await AuthService.refresh(hash);
            assert.fail('La llamada debería haber lanzado un error bloqueando el reúso');
        } catch (err) {
            assert.ok(err.message.includes('revocado'), 'El error debe indicar la revocación o seguridad');
        }

        // Verificamos el Castigo: El secondRefreshTokenPlain (legítimo del usuario) debió haber sido revocado en cascada
        const secondHash = TokenService.hashToken(secondRefreshTokenPlain);
        const secondData = await AuthRepository.findRefreshTokenAllStates(secondHash);

        assert.ok(secondData.revoked_at, 'El CASTIGO funcionó: Todas las sesiones del usuario incluyendo la activa han sido revocadas');
    });
});
