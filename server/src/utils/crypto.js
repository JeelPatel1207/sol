const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKeyBuffer(keyHexOrSecret) {
  if (!keyHexOrSecret) {
    throw new Error('Encryption key is missing');
  }

  // If 64 hex characters (32 bytes)
  if (typeof keyHexOrSecret === 'string' && keyHexOrSecret.length === 64 && /^[0-9a-fA-F]+$/.test(keyHexOrSecret)) {
    return Buffer.from(keyHexOrSecret, 'hex');
  }

  // Otherwise, hash key with sha256 to guarantee 32-byte key
  return crypto.createHash('sha256').update(String(keyHexOrSecret)).digest();
}

/**
 * Encrypt plain text using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedHex
 */
function encrypt(plainText, keyHex) {
  if (plainText === null || plainText === undefined) {
    return null;
  }

  const keyBuffer = getKeyBuffer(keyHex);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt cipher text created by encrypt()
 */
function decrypt(cipherText, keyHex) {
  if (!cipherText) {
    return null;
  }

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher text format. Expected iv:authTag:encrypted');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const keyBuffer = getKeyBuffer(keyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
