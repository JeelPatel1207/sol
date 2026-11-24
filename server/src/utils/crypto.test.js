const assert = require('assert');
const crypto = require('crypto');
const { encrypt, decrypt } = require('./crypto');

function runTests() {
  console.log('Running crypto tests...');

  // 1. Generate 32 bytes hex key
  const testKey = crypto.randomBytes(32).toString('hex');
  const sampleSecret = 'vendor_password_12345!@#';

  // 2. Encrypt and decrypt round trip
  const encrypted = encrypt(sampleSecret, testKey);
  assert(encrypted.includes(':'), 'Encrypted output should contain iv:authTag:cipher separated by colons');

  const decrypted = decrypt(encrypted, testKey);
  assert.strictEqual(decrypted, sampleSecret, 'Decrypted text must match original plain text');

  // 3. Null / empty handling
  assert.strictEqual(encrypt(null, testKey), null);
  assert.strictEqual(decrypt(null, testKey), null);

  // 4. Decrypt with wrong key should fail
  const wrongKey = crypto.randomBytes(32).toString('hex');
  let failed = false;
  try {
    decrypt(encrypted, wrongKey);
  } catch (err) {
    failed = true;
  }
  assert(failed, 'Decryption with wrong key should throw authentication error');

  // 5. Decrypt with tampered ciphertext should fail
  let tamperedFailed = false;
  try {
    const parts = encrypted.split(':');
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
    decrypt(parts.join(':'), testKey);
  } catch (err) {
    tamperedFailed = true;
  }
  assert(tamperedFailed, 'Decryption of tampered ciphertext must fail authentication');

  console.log('All crypto tests passed successfully!');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
