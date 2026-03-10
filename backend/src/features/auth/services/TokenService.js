import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../utils/authConfig.js';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_ACCESS_SECRET)) {
    console.error('CRITICAL ERROR: JWT_ACCESS_SECRET is missing in production environment.');
    process.exit(1);
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_only_secret_access_do_not_use_in_prod';

export const TokenService = {
    generateTokenPair(userId) {
        const payload = {
            sub: userId,
            iss: authConfig.app.apiUrl,
            aud: authConfig.app.appUrl,
            jti: crypto.randomUUID()
        };
        const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: authConfig.token.accessTtl });
        const refreshTokenPlain = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = this.hashToken(refreshTokenPlain);
        const expiresAt = new Date(Date.now() + authConfig.token.refreshMaxAgeMs);

        return { accessToken, refreshToken: refreshTokenPlain, refreshTokenHash, expiresAt };
    },

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, ACCESS_SECRET, {
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
