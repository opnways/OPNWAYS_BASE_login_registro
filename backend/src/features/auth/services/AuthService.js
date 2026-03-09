import argon2 from 'argon2';
import { AuthRepository } from '../repository/AuthRepository.js';
import { TokenService } from './TokenService.js';
import { EmailSender } from './EmailSender.js';
import { getClient } from '../../../utils/db.js';

// Fix 3: Hash dummy constante para mitigar timing attack en login.
// Se usa cuando el usuario no existe, para ejecutar siempre argon2.verify sin cortocircuitar.
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$BpCuBNaY6HH0GQtxGBxr4DjhSH3x8n5Mu/5mGi5jjDA';

// Fix 5: Fábrica simple para permitir inyección de dependencias en tests/extensiones.
// La instancia por defecto (abajo) usa las dependencias reales; AuthRoutes no cambia.
export function createAuthService({ repo, tokenService, emailSender, getDbClient }) {
    return {
        async register(email, password) {
            const existing = await repo.findUserByEmail(email);
            if (existing) throw new Error('El usuario ya existe'); // Se captura en AuthRoutes y no se expone al cliente

            const hash = await argon2.hash(password);
            const user = await repo.createUser(email, hash);
            return user;
        },

        async login(email, password) {
            const user = await repo.findUserByEmail(email);

            // Fix 3: Ejecutar siempre argon2.verify para evitar timing attack (enumeración de usuarios)
            const hashToVerify = user ? user.password_hash : DUMMY_HASH;
            const valid = await argon2.verify(hashToVerify, password);

            if (!user || !valid) throw new Error('Credenciales inválidas');

            // Fix 4: TokenService solo genera tokens; AuthService persiste el refresh token
            const { accessToken, refreshToken, refreshTokenHash, expiresAt } = tokenService.generateTokenPair(user.id);
            await repo.saveRefreshToken(user.id, refreshTokenHash, expiresAt);

            return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
        },

        async logout(refreshTokenHash) {
            const tokenData = await repo.findRefreshToken(refreshTokenHash);
            if (tokenData) {
                await repo.revokeRefreshToken(tokenData.id);
            }
        },

        async refresh(refreshTokenHash) {
            const client = await getDbClient();
            try {
                await client.query('BEGIN');

                const tokenData = await repo.findRefreshTokenAllStates(refreshTokenHash, client);

                // Caso 1: El token base no existe en absoluto (ha sido borrado o es falso)
                if (!tokenData) {
                    await client.query('ROLLBACK');
                    throw new Error('Token de refresco inválido o modificado');
                }

                // Caso 2: Ataque de Reúso Detectado (El token existe pero ya está revocado o caducado)
                if (tokenData.revoked_at || new Date(tokenData.expires_at) < new Date()) {
                    // Castigo de Reúso: revoca TODOS los tokens del usuario real
                    await repo.revokeAllUserRefreshTokens(tokenData.user_id, client);
                    await client.query('COMMIT');

                    // Fix 8: Log detallado interno; el cliente recibe un mensaje genérico desde AuthRoutes
                    console.error(`[SECURITY ALERT] Refresh token reuse detected! User UUID: ${tokenData.user_id}. All sessions revoked.`);

                    throw new Error('SESSION_REVOKED');
                }

                // Caso 3: Rotación Normal
                // Fix 4: TokenService genera sin persistir; AuthService persiste
                const { accessToken, refreshToken, refreshTokenHash: newHash, expiresAt } = tokenService.generateTokenPair(tokenData.user_id);
                const insertId = await repo.saveRefreshToken(tokenData.user_id, newHash, expiresAt, client);

                // Revoca el token originario indicando también cual fue su sucesor (replaced_by)
                await repo.revokeRefreshToken(tokenData.id, insertId, client);

                await client.query('COMMIT');
                return { accessToken, refreshToken };

            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        },

        async forgotPassword(email) {
            const user = await repo.findUserByEmail(email);
            if (!user) return; // Silent return for security

            // One-Active-Token model: Invalidar tokens previos que se quedaron huérfanos sin usar
            await repo.invalidateAllUserResetTokens(user.id);

            const { token, hash } = await tokenService.generateResetToken();
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour

            await repo.savePasswordResetToken(user.id, hash, expiresAt);
            await emailSender.sendResetPassword(email, token);
        },

        async resetPassword(token, newPassword) {
            const hash = tokenService.hashToken(token);
            const tokenData = await repo.findPasswordResetToken(hash);

            if (!tokenData) {
                throw new Error('El enlace de recuperación es inválido o no existe.');
            }

            if (tokenData.used_at) {
                throw new Error('Este enlace de recuperación ya ha sido utilizado.');
            }

            if (new Date(tokenData.expires_at) < new Date()) {
                throw new Error('El enlace de recuperación ha caducado. Por favor, solicita uno nuevo.');
            }

            const newHash = await argon2.hash(newPassword);

            const client = await getDbClient();
            try {
                await client.query('BEGIN');

                // Actualizar contraseña al nuevo Hash
                await repo.updatePassword(tokenData.user_id, newHash, client);

                // Invalida explícitamente y de un golpe el token usado actualmente, junto a
                // CUALQUIER otro remanente que le quedara pendiente al usuario de envíos anteriores
                await repo.invalidateAllUserResetTokens(tokenData.user_id, client);

                // Revocar explícitamente todos los Refresh Tokens ("Sesiones Activas") del usuario tras el exitoso cambio
                // Esto asegura que atacantes con tokens robados previamente no puedan renovar la sesión
                await repo.revokeAllUserRefreshTokens(tokenData.user_id, client);

                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        },

        async getMe(userId) {
            const user = await repo.findUserById(userId);
            if (!user) throw new Error('Usuario no encontrado');
            return user;
        }
    };
}

// Instancia por defecto con dependencias reales — AuthRoutes sigue importando AuthService sin cambios
export const AuthService = createAuthService({
    repo: AuthRepository,
    tokenService: TokenService,
    emailSender: EmailSender,
    getDbClient: getClient,
});
