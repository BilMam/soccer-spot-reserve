// Utility functions for phone number normalization and hashing

/**
 * Normalize phone number to E.164 format (+225XXXXXXXX)
 */
export function normalizePhoneE164(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let clean = phone.replace(/[\s\-\(\)]/g, '');
  
  // Normalize to E.164
  if (clean.startsWith('00225')) {
    clean = '+' + clean.substring(2);
  } else if (clean.startsWith('225')) {
    clean = '+' + clean;
  } else if (clean.startsWith('0')) {
    clean = '+225' + clean.substring(1);
  } else if (!clean.startsWith('+')) {
    clean = '+225' + clean;
  }
  
  // Validate format (Ivorian number: +225 followed by 8-10 digits)
  if (!/^\+225[0-9]{8,10}$/.test(clean)) {
    return null;
  }
  
  return clean;
}

/**
 * Hash phone number using SHA-256
 */
export async function hashPhone(e164Phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(e164Phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask phone number for display (show only last 2 digits)
 */
export function maskPhone(e164Phone: string): string {
  const digits = e164Phone.replace(/\D/g, '');
  return '****' + digits.slice(-2);
}

/**
 * Process phone number: normalize, hash, and mask
 */
export async function processPhone(phone: string): Promise<{
  e164: string;
  hash: string;
  masked: string;
} | null> {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return null;
  
  const hash = await hashPhone(e164);
  const masked = maskPhone(e164);
  
  return { e164, hash, masked };
}
