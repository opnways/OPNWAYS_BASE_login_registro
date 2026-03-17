import { query } from '../../../utils/db.js';

export const AuthRepository = {
    async createUser(email, passwordHash, client = null) {
        const executor = client || { query };
        const res = await executor.query(
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

    // Higiene de sesiones mejorada con recolección opcional de IP y UA en nueva creación,
    // y marcado de uso (last_used_at). Se requiere correr migración en /src/migrations/.
    async saveRefreshToken(userId, tokenHash, expiresAt, client = null, ip = null, userAgent = null) {
        const executor = client || { query };
        const res = await executor.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_ip, user_agent, last_used_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
            [userId, tokenHash, expiresAt, ip, userAgent]
        );
        return res.rows[0].id;
    },

    async findRefreshToken(tokenHash, client = null) {
        const executor = client || { query };
        const res = await executor.query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()',
            [tokenHash]
        );
        return res.rows[0];
    },

    async findRefreshTokenAllStates(tokenHash, client = null) {
        const executor = client || { query };
        const res = await executor.query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1',
            [tokenHash]
        );
        return res.rows[0];
    },

    async revokeRefreshToken(id, replacedBy = null, client = null) {
        const executor = client || { query };
        await executor.query(
            'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $2 WHERE id = $1',
            [id, replacedBy]
        );
    },

    async revokeAllUserRefreshTokens(userId, client = null) {
        const executor = client || { query };
        await executor.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [userId]
        );

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

    async usePasswordResetToken(id, client = null) {
        const executor = client || { query };
        await executor.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [id]);
    },

    async invalidateAllUserResetTokens(userId, client = null) {
        const executor = client || { query };
        await executor.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
            [userId]
        );
    },

    async updatePassword(userId, passwordHash, client = null) {
        const executor = client || { query };
        await executor.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    },

    async countActiveSessions() {
        // Suggested Index: CREATE INDEX idx_refresh_tokens_active ON refresh_tokens (revoked_at, expires_at);
        const res = await query('SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW()');
        return parseInt(res.rows[0].count, 10) || 0;
    },

    async cleanupExpiredTokens(client = null) {
        const executor = client || { query };
        // Limpieza oportunista: Elimina físicamente tokens caducados hace más de 7 días
        // para mantener la tabla limpia sin necesidad de un cron.
        // También limpia reset tokens muy antiguos.
        await executor.query(`
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW() - INTERVAL '7 days';
        `);
        await executor.query(`
            DELETE FROM password_reset_tokens
            WHERE expires_at < NOW() - INTERVAL '7 days';
        `);
    }
};
