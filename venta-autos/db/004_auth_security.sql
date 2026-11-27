BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono_verificado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_fallos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_ventana TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_bloqueado_hasta TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('verify_email','login')),
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email','sms')),
  code_hash CHAR(64) NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_created
  ON auth_challenges(user_id,purpose,created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
COMMIT;
