-- NEON: ejecutar primero en una rama de pruebas, conectado a la BD que ya contiene
-- usuarios, vehiculos y apartados. LOCAL: puede ejecutarse aunque ya creaste estas tablas.
-- No contiene DROP ni modifica los precios del catálogo.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='estado_orden') THEN
    CREATE TYPE estado_orden AS ENUM ('pendiente','pago_confirmado','cancelada','expirada');
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS ordenes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  referencia UUID NOT NULL UNIQUE,
  concepto VARCHAR(20) NOT NULL CHECK(concepto IN ('compra','anticipo')),
  moneda CHAR(3) NOT NULL DEFAULT 'MXN' CHECK(moneda='MXN'),
  total_vehiculos NUMERIC(14,2) NOT NULL CHECK(total_vehiculos>0),
  importe_a_cobrar NUMERIC(14,2) NOT NULL CHECK(importe_a_cobrar>0),
  estado estado_orden NOT NULL DEFAULT 'pendiente',
  comprador_nombre VARCHAR(100) NOT NULL,
  comprador_email VARCHAR(150) NOT NULL,
  comprador_telefono VARCHAR(20),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vence_en TIMESTAMPTZ,
  pago_confirmado_en TIMESTAMPTZ,
  CHECK(importe_a_cobrar<=total_vehiculos),
  CHECK(concepto<>'compra' OR importe_a_cobrar=total_vehiculos)
);
CREATE TABLE IF NOT EXISTS orden_detalles (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes(id) ON DELETE RESTRICT,
  vehiculo_id INT NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
  apartado_id INT REFERENCES apartados(id) ON DELETE SET NULL,
  marca VARCHAR(50) NOT NULL, modelo VARCHAR(100) NOT NULL, anio INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1 CHECK(cantidad>0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK(precio_unitario>0),
  subtotal NUMERIC(14,2) GENERATED ALWAYS AS (cantidad*precio_unitario) STORED,
  UNIQUE(orden_id,vehiculo_id)
);
CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes(id) ON DELETE RESTRICT,
  proveedor VARCHAR(30) NOT NULL DEFAULT 'mercado_pago' CHECK(proveedor='mercado_pago'),
  ambiente VARCHAR(10) NOT NULL DEFAULT 'prueba' CHECK(ambiente IN ('prueba','produccion')),
  clave_idempotencia UUID NOT NULL UNIQUE,
  mp_order_id VARCHAR(100) UNIQUE, mp_payment_id VARCHAR(100) UNIQUE,
  estado_proveedor VARCHAR(100), detalle_estado_proveedor VARCHAR(150),
  importe NUMERIC(14,2) NOT NULL CHECK(importe>0),
  moneda CHAR(3) NOT NULL DEFAULT 'MXN' CHECK(moneda='MXN'),
  metodo_pago VARCHAR(50), tipo_pago VARCHAR(50), cuotas INT CHECK(cuotas>0),
  tarjeta_ultimos_cuatro VARCHAR(4) CHECK(tarjeta_ultimos_cuatro ~ '^[0-9]{4}$'),
  importe_reembolsado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(importe_reembolsado>=0 AND importe_reembolsado<=importe),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmado_en TIMESTAMPTZ, ultima_verificacion_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario_fecha ON ordenes(usuario_id,creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_orden_detalles_vehiculo ON orden_detalles(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_orden_detalles_apartado ON orden_detalles(apartado_id);
CREATE INDEX IF NOT EXISTS idx_pagos_orden ON pagos(orden_id);
COMMIT;
