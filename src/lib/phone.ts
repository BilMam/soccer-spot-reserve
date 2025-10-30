import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';
import { sha256 } from 'js-sha256';

/**
 * Normalize phone number to E.164 format
 */
export function normalizeToE164(phone: string, defaultCountry?: CountryCode): string | null {
  if (!phone) return null;
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number; // Returns E.164 format
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Hash phone number using SHA-256
 */
export function hashPhone(e164Phone: string): string {
  return sha256(e164Phone);
}

/**
 * Mask phone number for display (show only last 2 digits)
 */
export function maskPhone(e164Phone: string): string {
  const digits = e164Phone.replace(/\D/g, '');
  return '****' + digits.slice(-2);
}

/**
 * Get country code from E.164 phone number
 */
export function getCountryFromE164(e164Phone: string): CountryCode | undefined {
  try {
    const phoneNumber = parsePhoneNumber(e164Phone);
    return phoneNumber?.country;
  } catch {
    return undefined;
  }
}

/**
 * Validate if phone number is valid for given country
 */
export function isValidPhoneNumber(phone: string, country?: CountryCode): boolean {
  try {
    const phoneNumber = parsePhoneNumber(phone, country);
    return phoneNumber?.isValid() ?? false;
  } catch {
    return false;
  }
}

/**
 * Process phone for auth: normalize, hash, and mask
 */
export async function processPhoneForAuth(phone: string, country?: CountryCode): Promise<{
  e164: string;
  hash: string;
  masked: string;
} | null> {
  const e164 = normalizeToE164(phone, country);
  if (!e164) return null;
  
  const hash = hashPhone(e164);
  const masked = maskPhone(e164);
  
  return { e164, hash, masked };
}
