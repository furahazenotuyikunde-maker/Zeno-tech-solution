import { createCipheriv, createHash, randomBytes } from 'node:crypto';

export function encryptHardwarePayload(payload: Record<string, string>) {
  const secret = process.env.HARDWARE_COMMAND_ENCRYPTION_KEY;
  if (!secret) throw new Error('Hardware command encryption is not configured. Set HARDWARE_COMMAND_ENCRYPTION_KEY.');

  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}
