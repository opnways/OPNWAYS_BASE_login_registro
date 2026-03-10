-- Up Migration: Sesiones e Higiene
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS created_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indice para limpiezas futuras de tokens expirados
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Down Migration
-- ALTER TABLE refresh_tokens DROP COLUMN created_ip, DROP COLUMN user_agent, DROP COLUMN last_used_at;
-- DROP INDEX idx_refresh_tokens_expires_at;