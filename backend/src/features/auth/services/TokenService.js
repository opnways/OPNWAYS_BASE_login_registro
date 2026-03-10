import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../utils/authConfig.js';

export const TokenService = {
    generateTokenPair(userId) {
        const payload = {
            sub: userId,
            iss: authConfig.app.apiUrl,
            aud: authConfig.app.appUrl,
            jti: crypto.randomUUID()
        };
        const accessToken = jwt.sign(payload, authConfig.token.accessSecret, { expiresIn: authConfig.token.accessTtl });
        const refreshTokenPlain = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = this.hashToken(refreshTokenPlain);
        const expiresAt = new Date(Date.now() + authConfig.token.refreshMaxAgeMs);

        return { accessToken, refreshToken: refreshTokenPlain, refreshTokenHash, expiresAt };
    },

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, authConfig.token.accessSecret, {
                issuer: authConfig.app.apiUrl,
                audience: authConfig.app.appUrl
            });
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
