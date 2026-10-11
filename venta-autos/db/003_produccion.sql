-- Ejecutar en Neon antes de desplegar el código de producción. Idempotente.
BEGIN;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS autorizado_en TIMESTAMPTZ;
COMMIT;
