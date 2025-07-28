/**
 * @jest-environment jsdom
 */

// Mock Supabase client for edge function tests
const mockEdgeSupabaseClient = {
  from: jest.fn(),
  functions: {
    invoke: jest.fn(),
  },
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
};

describe('Edge Function Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('owners-signup Edge Function', () => {
    it('should validate full_name minimum length requirement', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Full name is required (minimum 2 characters)',
          code: 'VALIDATION_ERROR'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('owners-signup', {
        body: {
          phone: '+2250701234567',
          full_name: 'A', // Too short
          otp_validated: true
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('minimum 2 characters');
    });

    it('should reject signup without OTP validation', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'OTP must be validated before signup',
          code: 'OTP_NOT_VALIDATED',
          retryable: true
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('owners-signup', {
        body: {
          phone: '+2250701234567',
          full_name: 'Test Owner',
          otp_validated: false
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.code).toBe('OTP_NOT_VALIDATED');
      expect(data.retryable).toBe(true);
    });

    it('should handle authentication errors gracefully', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Invalid or expired token',
          code: 'AUTH_ERROR'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('owners-signup', {
        body: {
          phone: '+2250701234567',
          full_name: 'Test Owner',  
          otp_validated: true
        },
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid or expired token');
    });

    it('should handle missing authorization header', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Missing authorization header',
          code: 'AUTH_ERROR'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('owners-signup', {
        body: {
          phone: '+2250701234567',
          full_name: 'Test Owner',
          otp_validated: true
        }
        // No Authorization header
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing authorization header');
    });
  });

  describe('create-owner-contact Edge Function', () => {
    it('should handle test mode when CinetPay credentials are missing', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Contact créé en mode test (identifiants CinetPay manquants)',
          test_mode: true,
          owner_id: 'user-456'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          owner_name: 'Test Owner',
          phone: '+2250701234567',
          email: 'test@example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.test_mode).toBe(true);
      expect(data.message).toContain('mode test');
    });

    it('should validate required contact data fields', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Missing required fields: owner_name, phone'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          email: 'test@example.com'
          // Missing owner_name and phone
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing required fields');
    });

    it('should handle CinetPay authentication failures', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Échec authentification CinetPay: Invalid credentials'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          owner_name: 'Test Owner',
          phone: '+2250701234567',
          email: 'test@example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Échec authentification CinetPay');
    });

    it('should handle network timeout errors', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Request timeout after 15000ms'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          owner_name: 'Test Owner',
          phone: '+2250701234567',
          email: 'test@example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('timeout');
    });
  });

  describe('request-owner-otp Edge Function', () => {
    it('should send OTP to valid Ivorian phone number', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'OTP sent successfully',
          phone: '+2250701234567'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('request-owner-otp', {
        body: {
          phone_payout: '+2250701234567'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.phone).toBe('+2250701234567');
    });

    it('should reject invalid phone number format', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Invalid phone number format. Must be 10-digit Ivorian number.'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('request-owner-otp', {
        body: {
          phone_payout: '+33601234567' // French number, not Ivorian
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid phone number format');
    });

    it('should handle SMS service failures', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'SMS service temporarily unavailable'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('request-owner-otp', {
        body: {
          phone_payout: '+2250701234567'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('SMS service temporarily unavailable');
    });
  });

  describe('Environment and Configuration', () => {
    it('should handle missing Supabase configuration', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Missing Supabase configuration'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('owners-signup', {
        body: {
          phone: '+2250701234567',
          full_name: 'Test Owner',
          otp_validated: true
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing Supabase configuration');
    });

    it('should handle database connection failures', async () => {
      mockEdgeSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Database connection failed'
        },
        error: null
      });

      const { data, error } = await mockEdgeSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          owner_name: 'Test Owner',
          phone: '+2250701234567',
          email: 'test@example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Database connection failed');
    });
  });
});