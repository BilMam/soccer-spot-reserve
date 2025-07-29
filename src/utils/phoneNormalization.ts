/**
 * Utility functions for normalizing and validating Ivorian phone numbers
 * Supports formats: +225XXXXXXXX, 225XXXXXXXX, 0XXXXXXXX, XXXXXXXX (8 digits)
 */

/**
 * Normalizes an Ivorian phone number to the format +225XXXXXXXX
 * @param phone - Phone number in various formats
 * @returns Normalized phone number in +225XXXXXXXX format, or null if invalid
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all spaces, dashes, and other non-digit characters except +
  const cleaned = phone.trim().replace(/[\s\-().]/g, '');
  
  // Handle different input formats
  let digits = '';
  
  if (cleaned.startsWith('+225')) {
    // Format: +225XXXXXXXX
    digits = cleaned.substring(4);
  } else if (cleaned.startsWith('225')) {
    // Format: 225XXXXXXXX
    digits = cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    // Format: 0XXXXXXXX (local format with leading 0)
    digits = cleaned.substring(1);
  } else if (/^\d{8}$/.test(cleaned)) {
    // Format: XXXXXXXX (8 digits only)
    digits = cleaned;
  } else {
    // Invalid format
    return null;
  }

  // Validate that we have exactly 8 digits
  if (!/^\d{8}$/.test(digits)) {
    return null;
  }

  // Validate Ivorian mobile prefixes (01, 05, 07, 08, 09)
  const firstTwoDigits = digits.substring(0, 2);
  const validPrefixes = ['01', '05', '07', '08', '09'];
  
  if (!validPrefixes.includes(firstTwoDigits)) {
    return null;
  }

  return `+225${digits}`;
}

/**
 * Checks if two phone numbers are equivalent after normalization
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if the numbers are equivalent, false otherwise
 */
export function arePhoneNumbersEquivalent(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  if (!normalized1 || !normalized2) {
    return false;
  }
  
  return normalized1 === normalized2;
}

/**
 * Validates if a phone number is a valid Ivorian mobile number
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidIvorianPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return normalized !== null;
}

/**
 * Extracts the raw 8-digit number without country code
 * Used for CinetPay API calls which expect format without +225
 * @param phone - Phone number in any supported format
 * @returns 8-digit number string, or null if invalid
 */
export function extractPhoneDigits(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return null;
  }
  
  // Remove +225 prefix to get 8 digits
  return normalized.substring(4);
}

/**
 * Formats phone number for display purposes
 * @param phone - Phone number to format
 * @returns Formatted phone number as +225 XX XX XX XX or original if invalid
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return phone; // Return original if can't normalize
  }
  
  const digits = normalized.substring(4);
  return `+225 ${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 6)} ${digits.substring(6, 8)}`;
}