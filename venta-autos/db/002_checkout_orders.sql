-- Ejecutar TAMBIÉN en local aunque ya aplicaste el SQL compartido en el chat.
-- solicitud_mp contiene un payload CIFRADO con AES-GCM, nunca el token en texto plano.
-- Se elimina después de obtener el ID de MP. No se guardan número de tarjeta ni CVV.
BEGIN;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS solicitud_mp JSONB;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS actualizado_mp_en TIMESTAMPTZ;
-- Solo datos seleccionados de transacciones; jamás tokens de tarjeta ni respuesta cruda.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS transacciones JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Antes lo creaba automáticamente server.js. Ahora la migración es explícita.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compras_totales INTEGER DEFAULT 0;
COMMIT;
