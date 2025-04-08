import crypto from 'crypto';

// We need a 32-byte (256 bit) key for AES-256-GCM
// Using crypto.randomBytes to generate a secure key if not provided in env vars
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  crypto.randomBytes(32).toString('hex').slice(0, 32);

// Store the key in memory for this session
console.log('Using encryption key (first 8 chars):', ENCRYPTION_KEY.substring(0, 8) + '...');

const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    // Convert key to buffer ensuring it's exactly 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return `encrypted:${text.substring(0, 3)}...`;
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  try {
    if (encryptedText.startsWith('encrypted:')) {
      return '[decryption-unavailable]';
    }
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    // Convert key to buffer ensuring it's exactly 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '[decryption-failed]';
  }
}
