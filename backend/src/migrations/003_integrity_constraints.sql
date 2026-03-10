-- ============================================================
-- Migración 003: Constraints de integridad para tokens
-- ============================================================

-- 1. UNIQUE en token_hash de refresh_tokens
--    Por diseño, ningún token puede existir dos veces en la tabla.
--    Sin este constraint, una colisión de hash (improbable pero posible)
--    o un bug de doble-insert podría crear duplicados silenciosos que
--    rompen la lógica de rotación y detección de reúso.
ALTER TABLE refresh_tokens
    ADD CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash);

-- 2. UNIQUE en token_hash de password_reset_tokens
--    Misma razón: el hash del token de reset debe ser inequívoco.
ALTER TABLE password_reset_tokens
    ADD CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash);

-- 3. FK explícita en refresh_tokens.replaced_by → refresh_tokens.id
--    El campo replaced_by ya existía como UUID libre, sin integridad referencial.
--    Si el token sucesor se borra (ej. por limpieza) el registro huérfano quedaría
--    apuntando a un id inexistente. Con SET NULL al borrar, se limpia automáticamente.
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_replaced_by
    FOREIGN KEY (replaced_by)
    REFERENCES refresh_tokens(id)
    ON DELETE SET NULL;

-- 4. Índice en replaced_by para trazabilidad de cadenas de rotación sin scan completo
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_replaced_by
    ON refresh_tokens (replaced_by)
    WHERE replaced_by IS NOT NULL;
