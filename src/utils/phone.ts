/**
 * Format a Côte d'Ivoire phone number for display
 * Input: raw phone number (e.g., "2250102030405", "0102030405", "+2250102030405")
 * Output: formatted display string "+225 01 02 03 04 05"
 */
export const formatCI = (raw: string): string => {
  // Remove the +225 prefix if present and any non-digits
  const digits = raw
    .replace(/^(\+?225)?/, '')
    .replace(/[^0-9]/g, '')
    .padStart(10, '0'); // Ensure 10 digits

  // Format as +225 XX XX XX XX XX
  return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+225 $1 $2 $3 $4 $5');
};

/**
 * Normalize a Côte d'Ivoire phone number for storage
 * Input: user input (e.g., "01 02 03 04 05", "+225 01 02 03 04 05")
 * Output: normalized format "2250102030405"
 */
export const normalizeCI = (input: string): string => {
  // Remove any non-digits and ensure we start with the local number
  const digits = input.replace(/^(\+?225)?/, '').replace(/[^0-9]/g, '');
  
  // Pad to 10 digits and add country code
  return `225${digits.padStart(10, '0').slice(0, 10)}`;
};

/**
 * Validate a Côte d'Ivoire phone number
 * Returns true if the number has exactly 10 local digits
 */
export const validateCI = (phone: string): boolean => {
  const digits = phone.replace(/^(\+?225)?/, '').replace(/[^0-9]/g, '');
  return /^\d{10}$/.test(digits);
};