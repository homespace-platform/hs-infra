-- Run before deploying Core when JPA_DDL_AUTO is validate/none.
-- With JPA_DDL_AUTO=update, Hibernate adds this nullable column on startup.
-- Existing/signed documents remain unchanged.
ALTER TABLE contract_documents
    ADD COLUMN IF NOT EXISTS render_fingerprint varchar(64);
