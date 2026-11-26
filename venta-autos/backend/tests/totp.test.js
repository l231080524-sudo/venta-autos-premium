import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchingStep, totpCode } from '../totp.js';

test('TOTP coincide con los vectores SHA-1 del RFC 6238 reducidos a seis dígitos', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(totpCode(secret, 1), '287082');
  assert.equal(totpCode(secret, 37037036), '081804');
  assert.equal(totpCode(secret, 666666666), '353130');
  assert.equal(matchingStep(secret, '287082', null, 61_000), 1);
  assert.equal(matchingStep(secret, '287082', 1, 61_000), null);
  assert.equal(matchingStep(secret, '287082', null, 91_000), null);
});
