import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Get encryption key from environment
 * Must be a 32-byte (64 hex character) string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a string value
 * Returns: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted (all base64)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join(':')
}

/**
 * Decrypt a string value
 * Input format: iv:authTag:encryptedData (all base64)
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivB64, authTagB64, encryptedB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}
