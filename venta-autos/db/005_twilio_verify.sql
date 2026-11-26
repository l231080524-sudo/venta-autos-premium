ALTER TABLE auth_challenges
  ADD COLUMN IF NOT EXISTS sms_verification_sid VARCHAR(34);
