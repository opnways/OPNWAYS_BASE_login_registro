import { query } from '../../../utils/db.js';

export const AuthRepository = {
    async createUser(email, passwordHash) {
        const res = await query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, passwordHash]
        );
        return res.rows[0];
    },

    async findUserByEmail(email) {
        const res = await query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    },

    async findUserById(id) {
        const res = await query('SELECT id, email, created_at FROM users WHERE id = $1', [id]);
        return res.rows[0];
    },

    async saveRefreshToken(userId, tokenHash, expiresAt) {
        const res = await query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
            [userId, tokenHash, expiresAt]
        );
        return res.rows[0].id;
    },

    async findRefreshToken(tokenHash) {
        const res = await query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()',
            [tokenHash]
        );
        return res.rows[0];
    },

    async revokeRefreshToken(id) {
        await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [id]);
    },

    async savePasswordResetToken(userId, tokenHash, expiresAt) {
        await query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [userId, tokenHash, expiresAt]
        );
    },

    async findPasswordResetToken(tokenHash) {
        const res = await query(
            'SELECT * FROM password_reset_tokens WHERE token_hash = $1',
            [tokenHash]
        );
        return res.rows[0];
    },

    async usePasswordResetToken(id) {
        await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [id]);
    },

    async updatePassword(userId, passwordHash) {
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    },

    async countActiveSessions() {
        // Suggested Index: CREATE INDEX idx_refresh_tokens_active ON refresh_tokens (revoked_at, expires_at);
        const res = await query('SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW()');
        return parseInt(res.rows[0].count, 10) || 0;
    }
};
