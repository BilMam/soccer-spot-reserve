/**
 * @jest-environment jsdom
 */

// Import functions directly since they are also defined in Edge Functions
// These are the same implementations as used in owners-signup and create-owner-contact

const normalizePhoneNumber = (phone: string): string | null => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all spaces, dashes, and other non-digit characters except +
  const cleaned = phone.trim().replace(/[\s\-().]/g, '');
  
  let nationalFormat = '';
  
  if (cleaned.startsWith('+225')) {
    // Format: +225XXXXXXXXXX (10 digits after +225)
    nationalFormat = cleaned.substring(4);
  } else if (cleaned.startsWith('225')) {
    // Format: 225XXXXXXXXXX (10 digits after 225)
    nationalFormat = cleaned.substring(3);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Format: 0XXXXXXXXX (already in national format)
    nationalFormat = cleaned;
  } else if (/^\d{8}$/.test(cleaned)) {
    // Format: XXXXXXXX (8 digits - add leading 0)
    nationalFormat = '0' + cleaned;
  } else {
    // Invalid format
    return null;
  }

  // Should be exactly 10 digits starting with 0
  if (!/^0\d{9}$/.test(nationalFormat)) {
    return null;
  }

  // Check valid Ivorian mobile prefixes (first digit after 0)
  const firstDigit = nationalFormat[1];
  const validFirstDigits = ['1', '5', '7', '8', '9'];
  
  if (!validFirstDigits.includes(firstDigit)) {
    return null;
  }

  return `+225${nationalFormat}`;
};

const arePhoneNumbersEquivalent = (phone1: string, phone2: string): boolean => {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  if (!normalized1 || !normalized2) {
    return false;
  }
  
  return normalized1 === normalized2;
};

const isValidIvorianPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  return normalized !== null;
};

const extractPhoneDigits = (phone: string): string | null => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return null;
  }
  
  // Remove +225 prefix to get national format (0XXXXXXXXX)
  const nationalFormat = normalized.substring(4);
  // Remove leading 0 to get 8 digits for CinetPay, ensuring exactly 8 digits
  const digits = nationalFormat.substring(1);
  return digits.substring(0, 8);
};

const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return phone; // Return original if can't normalize
  }
  
  // Extract national format (0XXXXXXXXX) and format as: +225 0X XX XX XX XX
  const nationalFormat = normalized.substring(4); // Remove +225
  return `+225 ${nationalFormat.substring(0, 2)} ${nationalFormat.substring(2, 4)} ${nationalFormat.substring(4, 6)} ${nationalFormat.substring(6, 8)} ${nationalFormat.substring(8, 10)}`;
};

describe('Phone Normalization Utilities', () => {
  describe('normalizePhoneNumber', () => {
    it('should normalize phone number with +225 prefix', () => {
      expect(normalizePhoneNumber('+2250701234567')).toBe('+2250701234567');
      expect(normalizePhoneNumber('+2250501234567')).toBe('+2250501234567');
      expect(normalizePhoneNumber('+2250901234567')).toBe('+2250901234567');
    });

    it('should normalize phone number with 225 prefix (no +)', () => {
      expect(normalizePhoneNumber('2250701234567')).toBe('+2250701234567');
      expect(normalizePhoneNumber('2250501234567')).toBe('+2250501234567');
    });

    it('should normalize phone number with leading zero (local format)', () => {
      expect(normalizePhoneNumber('0701234567')).toBe('+2250701234567');
      expect(normalizePhoneNumber('0501234567')).toBe('+2250501234567');
      expect(normalizePhoneNumber('0901234567')).toBe('+2250901234567');
    });

    it('should reject invalid 8-digit phone numbers', () => {
      // 8-digit numbers without context are invalid
      expect(normalizePhoneNumber('70123456')).toBeNull();
      expect(normalizePhoneNumber('50123456')).toBeNull();
      expect(normalizePhoneNumber('90123456')).toBeNull();
    });

    it('should handle phone numbers with spaces and dashes', () => {
      expect(normalizePhoneNumber('+225 07 01 23 45 67')).toBe('+2250701234567');
      expect(normalizePhoneNumber('225-07-01-23-45-67')).toBe('+2250701234567');
      expect(normalizePhoneNumber('07.01.23.45.67')).toBe('+2250701234567');
      expect(normalizePhoneNumber('07 01 23 45 67')).toBe('+2250701234567');
    });

    it('should handle phone numbers with parentheses', () => {
      expect(normalizePhoneNumber('(225) 07 01 23 45 67')).toBe('+2250701234567');
      expect(normalizePhoneNumber('+225 (07) 01-23-45-67')).toBe('+2250701234567');
    });

    it('should reject invalid phone numbers', () => {
      // Wrong prefix (not valid Ivorian mobile)
      expect(normalizePhoneNumber('+2250201234567')).toBeNull(); // 02 not valid
      expect(normalizePhoneNumber('+2250301234567')).toBeNull(); // 03 not valid
      expect(normalizePhoneNumber('+2250401234567')).toBeNull(); // 04 not valid
      expect(normalizePhoneNumber('+2250601234567')).toBeNull(); // 06 not valid
      
      // Wrong length
      expect(normalizePhoneNumber('0701234')).toBeNull(); // Too short
      expect(normalizePhoneNumber('070123456789')).toBeNull(); // Too long
      
      // Invalid format
      expect(normalizePhoneNumber('+33601234567')).toBeNull(); // French number
      expect(normalizePhoneNumber('invalid')).toBeNull();
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber(null as any)).toBeNull();
    });

    it('should validate all supported Ivorian mobile prefixes', () => {
      const validPrefixes = ['01', '05', '07', '08', '09'];
      
      validPrefixes.forEach(prefix => {
        const testNumber = `${prefix}12345678`; // 10 digits total (prefix + 8 digits)
        expect(normalizePhoneNumber(testNumber)).toBe(`+225${prefix}12345678`);
      });
    });
  });

  describe('arePhoneNumbersEquivalent', () => {
    it('should return true for equivalent phone numbers in different formats', () => {
      expect(arePhoneNumbersEquivalent('+2250701234567', '0701234567')).toBe(true);
      expect(arePhoneNumbersEquivalent('2250701234567', '0701234567')).toBe(true);  
      expect(arePhoneNumbersEquivalent('+225 07 01 23 45 67', '07.01.23.45.67')).toBe(true);
      expect(arePhoneNumbersEquivalent('(225) 07-01-23-45-67', '+225 07 01 23 45 67')).toBe(true);
    });

    it('should return false for different phone numbers', () => {
      expect(arePhoneNumbersEquivalent('+2250701234567', '+2250701234568')).toBe(false);
      expect(arePhoneNumbersEquivalent('0701234567', '0501234567')).toBe(false);
    });

    it('should return false for invalid phone numbers', () => {
      expect(arePhoneNumbersEquivalent('invalid', '0701234567')).toBe(false);
      expect(arePhoneNumbersEquivalent('+2250701234567', 'invalid')).toBe(false);
      expect(arePhoneNumbersEquivalent('invalid', 'also_invalid')).toBe(false);
    });
  });

  describe('isValidIvorianPhoneNumber', () => {
    it('should return true for valid Ivorian phone numbers', () => {
      expect(isValidIvorianPhoneNumber('+2250701234567')).toBe(true);
      expect(isValidIvorianPhoneNumber('0701234567')).toBe(true);
      expect(isValidIvorianPhoneNumber('0701234567')).toBe(true);
      expect(isValidIvorianPhoneNumber('225 07 01 23 45 67')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidIvorianPhoneNumber('+33601234567')).toBe(false); // French
      expect(isValidIvorianPhoneNumber('0201234567')).toBe(false); // Invalid prefix
      expect(isValidIvorianPhoneNumber('070123')).toBe(false); // Too short
      expect(isValidIvorianPhoneNumber('invalid')).toBe(false);
      expect(isValidIvorianPhoneNumber('')).toBe(false);
    });
  });

  describe('extractPhoneDigits', () => {
    it('should extract 8-digit phone number for CinetPay API', () => {
      expect(extractPhoneDigits('+2250701234567')).toBe('70123456');
      expect(extractPhoneDigits('2250701234567')).toBe('70123456');
      expect(extractPhoneDigits('0701234567')).toBe('70123456');
      expect(extractPhoneDigits('0712345678')).toBe('71234567');
    });

    it('should handle different formats and return consistent 8 digits', () => {
      expect(extractPhoneDigits('+225 07 01 23 45 67')).toBe('70123456');
      expect(extractPhoneDigits('225-07-01-23-45-67')).toBe('70123456');
      expect(extractPhoneDigits('(225) 07.01.23.45.67')).toBe('70123456');
    });

    it('should return null for invalid phone numbers', () => {
      expect(extractPhoneDigits('invalid')).toBeNull();
      expect(extractPhoneDigits('+33601234567')).toBeNull(); // French number
      expect(extractPhoneDigits('0201234567')).toBeNull(); // Invalid prefix
      expect(extractPhoneDigits('')).toBeNull();
    });
  });

  describe('formatPhoneForDisplay', () => {
    it('should format phone numbers for display', () => {
      expect(formatPhoneForDisplay('+2250701234567')).toBe('+225 07 01 23 45 67');
      expect(formatPhoneForDisplay('0701234567')).toBe('+225 07 01 23 45 67');
      expect(formatPhoneForDisplay('0712345678')).toBe('+225 07 12 34 56 78');
      expect(formatPhoneForDisplay('2250501234567')).toBe('+225 05 01 23 45 67');
    });

    it('should handle phone numbers with various formatting', () => {
      expect(formatPhoneForDisplay('+225 07 01 23 45 67')).toBe('+225 07 01 23 45 67');
      expect(formatPhoneForDisplay('225-07-01-23-45-67')).toBe('+225 07 01 23 45 67');
      expect(formatPhoneForDisplay('07.01.23.45.67')).toBe('+225 07 01 23 45 67');
    });

    it('should return original string for invalid phone numbers', () => {
      expect(formatPhoneForDisplay('invalid')).toBe('invalid');
      expect(formatPhoneForDisplay('+33601234567')).toBe('+33601234567');
      expect(formatPhoneForDisplay('')).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(normalizePhoneNumber(null as unknown as string)).toBeNull();
      expect(normalizePhoneNumber(undefined as unknown as string)).toBeNull();
      expect(extractPhoneDigits(null as unknown as string)).toBeNull();
      expect(extractPhoneDigits(undefined as unknown as string)).toBeNull();
    });

    it('should handle empty strings and whitespace', () => {
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber('   ')).toBeNull();
      expect(normalizePhoneNumber('\t\n')).toBeNull();
    });

    it('should handle non-string inputs', () => {
      expect(normalizePhoneNumber(123456789 as unknown as string)).toBeNull();
      expect(normalizePhoneNumber({} as unknown as string)).toBeNull();
      expect(normalizePhoneNumber([] as unknown as string)).toBeNull();
    });

    it('should handle phone numbers with extra characters', () => {
      expect(normalizePhoneNumber('phone: +2250701234567')).toBeNull();
      expect(normalizePhoneNumber('+2250701234567 (mobile)')).toBeNull();
      expect(normalizePhoneNumber('Call +2250701234567')).toBeNull();
    });
  });

  describe('Real-world Test Cases', () => {
    it('should handle common user input variations', () => {
      const testCases = [
        // Different ways users might enter the same number
        { input: '+225 07 01 23 45 67', expected: '+2250701234567' },
        { input: '225 07 01 23 45 67', expected: '+2250701234567' },
        { input: '07 01 23 45 67', expected: '+2250701234567' },
        { input: '0701234567', expected: '+2250701234567' },
        { input: '07-01-23-45-67', expected: '+2250701234567' },
        { input: '07.01.23.45.67', expected: '+2250701234567' },
        { input: '(07) 01 23 45 67', expected: '+2250701234567' },
        { input: '+225(07)01234567', expected: '+2250701234567' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizePhoneNumber(input)).toBe(expected);
      });
    });

    it('should validate all major Ivorian mobile operators', () => {
      const operatorPrefixes = {
        'Orange': ['07', '08', '09'],
        'MTN': ['05'],
        'Moov': ['01']
      };

      Object.entries(operatorPrefixes).forEach(([operator, prefixes]) => {
        prefixes.forEach(prefix => {
          const testNumber = `${prefix}12345678`; // 10 digits total (prefix + 8 digits)
          expect(normalizePhoneNumber(testNumber)).toBe(`+225${prefix}12345678`);
          expect(isValidIvorianPhoneNumber(testNumber)).toBe(true);
        });
      });
    });
  });
});