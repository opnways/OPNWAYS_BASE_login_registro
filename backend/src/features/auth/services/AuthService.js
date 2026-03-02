import argon2 from 'argon2';
import { AuthRepository } from '../repository/AuthRepository.js';
import { TokenService } from './TokenService.js';
import { EmailSender } from './EmailSender.js';

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
        const tokenData = await AuthRepository.findRefreshToken(refreshTokenHash);
        if (!tokenData) throw new Error('Token de refresco inválido o expirado');

        // Revoke old token (one-time use / rotation)
        await AuthRepository.revokeRefreshToken(tokenData.id);

        const { accessToken, refreshToken } = await TokenService.generateTokenPair(tokenData.user_id);
        return { accessToken, refreshToken };
    },

    async forgotPassword(email) {
        const user = await AuthRepository.findUserByEmail(email);
        if (!user) return; // Silent return for security

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
        await AuthRepository.updatePassword(tokenData.user_id, newHash);
        await AuthRepository.usePasswordResetToken(tokenData.id);
    },

    async getMe(userId) {
        const user = await AuthRepository.findUserById(userId);
        if (!user) throw new Error('Usuario no encontrado');
        return user;
    }
};
