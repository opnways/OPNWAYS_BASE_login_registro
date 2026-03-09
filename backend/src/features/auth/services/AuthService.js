import argon2 from 'argon2';
import { AuthRepository } from '../repository/AuthRepository.js';
import { TokenService } from './TokenService.js';
import { EmailSender } from './EmailSender.js';
import { getClient } from '../../../utils/db.js';

export const AuthService = {
    async register(email, password) {
        const existing = await AuthRepository.findUserByEmail(email);
        if (existing) throw new Error('El usuario ya existe'); // Se captura en AuthRoutes y no se expone al cliente

        const hash = await argon2.hash(password);
        const user = await AuthRepository.createUser(email, hash);
        return user;
    },

    async login(email, password) {
        const user = await AuthRepository.findUserByEmail(email);
        if (!user) throw new Error('Credenciales inválidas');

        const valid = await argon2.verify(user.password_hash, password);
        if (!valid) throw new Error('Credenciales inválidas');

        const { accessToken, refreshToken } = await TokenService.generateTokenPair(user.id);
        return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
    },

    async logout(refreshTokenHash) {
        const tokenData = await AuthRepository.findRefreshToken(refreshTokenHash);
        if (tokenData) {
            await AuthRepository.revokeRefreshToken(tokenData.id);
        }
    },

    async refresh(refreshTokenHash) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            const tokenData = await AuthRepository.findRefreshTokenAllStates(refreshTokenHash, client);

            // Caso 1: El token base no existe en absoluto (ha sido borrado o es falso)
            if (!tokenData) {
                await client.query('ROLLBACK');
                throw new Error('Token de refresco inválido o modificado');
            }

            // Caso 2: Ataque de Reúso Detectado (El token existe pero ya está revocado o caducado)
            if (tokenData.revoked_at || new Date(tokenData.expires_at) < new Date()) {
                // Castigo de Reúso: Si alguien usa un token robado, revocamos TODOS los tokens de ese usuario real
                await AuthRepository.revokeAllUserRefreshTokens(tokenData.user_id, client);
                await client.query('COMMIT');

                // Registro de evento de seguridad crítico
                console.error(`[SECURITY ALERT] Refresh token reuse detected! User UUID: ${tokenData.user_id}. All sessions revoked.`);

                throw new Error('Token de refresco revocado, por seguridad todas las sesiones se han cerrado.');
            }

            // Caso 3: Rotación Normal
            // Genera nuevas UUID insertando con la transaccion actual
            const { accessToken, refreshToken, insertId } = await TokenService.generateTokenPair(tokenData.user_id, client);

            // Revoca el token originario indicando también cual fue su sucesor (replaced_by)
            await AuthRepository.revokeRefreshToken(tokenData.id, insertId, client);

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
        const user = await AuthRepository.findUserByEmail(email);
        if (!user) return; // Silent return for security

        // One-Active-Token model: Invalidar tokens previos que se quedaron huérfanos sin usar
        await AuthRepository.invalidateAllUserResetTokens(user.id);

        const { token, hash } = await TokenService.generateResetToken();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await AuthRepository.savePasswordResetToken(user.id, hash, expiresAt);
        await EmailSender.sendResetPassword(email, token);
    },

    async resetPassword(token, newPassword) {
        const hash = TokenService.hashToken(token);
        const tokenData = await AuthRepository.findPasswordResetToken(hash);

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

        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Actualizar contraseña al nuevo Hash
            await AuthRepository.updatePassword(tokenData.user_id, newHash, client);

            // Invalida explícitamente y de un golpe el token usado actualmente, junto a 
            // CUALQUIER otro remanente que le quedara pendiente al usuario de envíos anteriores
            await AuthRepository.invalidateAllUserResetTokens(tokenData.user_id, client);

            // Revocar explícitamente todos los Refresh Tokens ("Sesiones Activas") del usuario tras el exitoso cambio
            // Esto asegura que atacantes con tokens robados previamente no puedan renovar la sesión
            await AuthRepository.revokeAllUserRefreshTokens(tokenData.user_id, client);

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    async getMe(userId) {
        const user = await AuthRepository.findUserById(userId);
        if (!user) throw new Error('Usuario no encontrado');
        return user;
    }
};
