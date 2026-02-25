import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRepository } from '../repository/AuthRepository.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret_access';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'secret_refresh';

export const TokenService = {
    async generateTokenPair(userId) {
        const accessToken = jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });
        const refreshTokenPlain = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = this.hashToken(refreshTokenPlain);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await AuthRepository.saveRefreshToken(userId, refreshTokenHash, expiresAt);

        return { accessToken, refreshToken: refreshTokenPlain };
    },

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, ACCESS_SECRET);
        } catch (err) {
            return null;
        }
    },

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    },

    async generateResetToken() {
        const token = crypto.randomBytes(32).toString('hex');
        const hash = this.hashToken(token);
        return { token, hash };
    }
};
