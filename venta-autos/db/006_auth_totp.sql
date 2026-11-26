BEGIN;
ALTER TABLE auth_challenges DROP CONSTRAINT IF EXISTS auth_challenges_channel_check;
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_channel_check CHECK (channel IN ('email','sms','totp'));

CREATE TABLE IF NOT EXISTS auth_totp (
  user_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  secret JSONB NOT NULL,
  setup_session_id UUID REFERENCES auth_sessions(id) ON DELETE CASCADE,
  setup_expires_at TIMESTAMPTZ,
  setup_attempts SMALLINT NOT NULL DEFAULT 0,
  enabled_at TIMESTAMPTZ,
  last_step BIGINT
);
COMMIT;
