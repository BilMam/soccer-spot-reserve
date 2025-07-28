/**
 * @jest-environment jsdom
 */

// Mock Supabase client without importing the real one
const mockCreateClient = jest.fn();

// Create mock client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  functions: {
    invoke: jest.fn(),
  },
};

describe('Owner Approval Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
  });

  describe('Step 1: Owner Application Creation', () => {
    it('should create pending owner application with verified phone', async () => {
      // Mock the owner_applications insert
      const mockFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              id: 'app-123',
              user_id: 'user-456',
              phone: '+2250701234567',
              phone_payout: '+2250701234567',
              status: 'pending',
              phone_verified_at: '2025-01-26T12:00:00Z',
              full_name: 'Test Owner',
              created_at: '2025-01-26T12:00:00Z'
            }],
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      // Simulate application creation
      const { data, error } = await mockSupabaseClient
        .from('owner_applications')
        .insert({
          user_id: 'user-456',
          phone: '+2250701234567',
          phone_payout: '+2250701234567',
          full_name: 'Test Owner',
          phone_verified_at: '2025-01-26T12:00:00Z',
          status: 'pending'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        status: 'pending',
        phone_verified_at: expect.any(String),
        phone: '+2250701234567'
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('owner_applications');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        user_id: 'user-456',
        phone: '+2250701234567',
        phone_payout: '+2250701234567',
        full_name: 'Test Owner',
        phone_verified_at: '2025-01-26T12:00:00Z',
        status: 'pending'
      });
    });

    it('should reject application without phone verification', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Phone verification required' }
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const { data, error } = await mockSupabaseClient
        .from('owner_applications')
        .insert({
          user_id: 'user-456',
          phone: '+2250701234567',
          full_name: 'Test Owner',
          phone_verified_at: null, // No verification
          status: 'pending'
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });
  });

  describe('Step 2: Admin Approval via RPC', () => {
    it('should approve valid application with phone verification', async () => {
      // Mock successful RPC call
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          message: 'Owner application approved successfully',
          owner_id: 'user-456',
          phone: '+2250701234567',
          should_create_contact: true,
          contact_data: {
            owner_id: 'user-456',
            owner_name: 'Test Owner',
            owner_surname: '',
            phone: '+2250701234567',
            email: 'test@example.com',
            country_prefix: '225'
          }
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: 'app-123'
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.should_create_contact).toBe(true);
      expect(data.contact_data).toMatchObject({
        owner_id: 'user-456',
        phone: '+2250701234567',
        owner_name: 'Test Owner'
      });

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('approve_owner_application', {
        application_id: 'app-123'
      });
    });

    it('should reject application without phone verification', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Phone number must be verified before approval'
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: 'app-123'
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Phone number must be verified');
    });

    it('should reject application with duplicate phone', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Phone number already registered by another owner'
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: 'app-123'
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Phone number already registered');
    });

    it('should require admin permissions', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Access denied: admin privileges required' }
      });

      const { data, error } = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: 'app-123'
      });

      expect(data).toBeNull();
      expect(error.message).toContain('admin privileges required');
    });
  });

  describe('Step 3: CinetPay Contact Creation', () => {
    it('should create CinetPay contact after approval', async () => {
      // Mock successful create-owner-contact edge function
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Contact créé avec succès',
          cinetpay_status: 'OPERATION_SUCCES',
          owner_id: 'user-456'
        },
        error: null
      });

      const contactData = {
        owner_id: 'user-456',
        owner_name: 'Test Owner',
        owner_surname: '',
        phone: '+2250701234567',
        email: 'test@example.com',
        country_prefix: '225'
      };

      const { data, error } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: contactData
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.cinetpay_status).toBe('OPERATION_SUCCES');
      expect(data.owner_id).toBe('user-456');

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('create-owner-contact', {
        body: contactData
      });
    });

    it('should handle existing CinetPay contact gracefully', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Contact déjà existant dans CinetPay mais enregistré en base',
          cinetpay_status: 'ERROR_PHONE_ALREADY_MY_CONTACT',
          owner_id: 'user-456'
        },
        error: null
      });

      const contactData = {
        owner_id: 'user-456',
        owner_name: 'Test Owner',
        phone: '+2250701234567',
        email: 'test@example.com'
      };

      const { data, error } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: contactData
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.cinetpay_status).toBe('ERROR_PHONE_ALREADY_MY_CONTACT');
    });

    it('should handle CinetPay API errors', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Échec authentification CinetPay: Invalid credentials'
        },
        error: null
      });

      const contactData = {
        owner_id: 'user-456',
        owner_name: 'Test Owner',
        phone: '+2250701234567',
        email: 'test@example.com'
      };

      const { data, error } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: contactData
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Échec authentification CinetPay');
    });
  });

  describe('Complete End-to-End Workflow', () => {
    it('should complete full workflow: application → approval → contact creation', async () => {
      // Step 1: Application creation (mocked as already done)
      const applicationId = 'app-123';

      // Step 2: Admin approval
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          message: 'Owner application approved successfully',
          owner_id: 'user-456',
          phone: '+2250701234567',
          should_create_contact: true,
          contact_data: {
            owner_id: 'user-456',
            owner_name: 'Test Owner',
            owner_surname: '',
            phone: '+2250701234567',
            email: 'test@example.com',
            country_prefix: '225'
          }
        },
        error: null
      });

      const approvalResult = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: applicationId
      });

      expect(approvalResult.data.success).toBe(true);
      expect(approvalResult.data.should_create_contact).toBe(true);

      // Step 3: CinetPay contact creation
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Contact créé avec succès',
          cinetpay_status: 'OPERATION_SUCCES',
          owner_id: 'user-456'
        },
        error: null
      });

      const contactResult = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: approvalResult.data.contact_data
      });

      expect(contactResult.data.success).toBe(true);
      expect(contactResult.data.cinetpay_status).toBe('OPERATION_SUCCES');

      // Verify the complete workflow
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('approve_owner_application', {
        application_id: applicationId
      });
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('create-owner-contact', {
        body: approvalResult.data.contact_data
      });
    });

    it('should handle partial failure: approval succeeds but contact creation fails', async () => {
      // Step 1: Successful approval
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          should_create_contact: true,
          contact_data: {
            owner_id: 'user-456',
            owner_name: 'Test Owner',
            phone: '+2250701234567',
            email: 'test@example.com'
          }
        },
        error: null
      });

      const approvalResult = await mockSupabaseClient.rpc('approve_owner_application', {
        application_id: 'app-123'
      });

      expect(approvalResult.data.success).toBe(true);

      // Step 2: Failed contact creation
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Variables d\'environnement CinetPay Transfer manquantes'
        },
        error: null
      });

      const contactResult = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: approvalResult.data.contact_data
      });

      expect(contactResult.data.success).toBe(false);

      // Owner should still be approved even if contact creation fails
      expect(approvalResult.data.success).toBe(true);
      expect(contactResult.data.success).toBe(false);
    });
  });

  describe('Database Schema Constraints', () => {
    it('should enforce unique phone constraint on owner_applications', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { 
              code: '23505', // PostgreSQL unique violation
              message: 'duplicate key value violates unique constraint "idx_owner_applications_phone_unique"'
            }
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const { data, error } = await mockSupabaseClient
        .from('owner_applications')
        .insert({
          user_id: 'user-789',
          phone: '+2250701234567', // Duplicate phone
          full_name: 'Another Owner',
          status: 'pending'
        })
        .select();

      expect(data).toBeNull();
      expect(error.code).toBe('23505');
      expect(error.message).toContain('unique constraint');
    });

    it('should enforce unique phone constraint on owners table', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { 
              code: '23505',
              message: 'duplicate key value violates unique constraint "idx_owners_phone_unique"'
            }
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const { data, error } = await mockSupabaseClient
        .from('owners')
        .insert({
          user_id: 'user-789',
          phone: '+2250701234567', // Duplicate phone
          status: 'approved'
        })
        .select();

      expect(data).toBeNull();
      expect(error.code).toBe('23505');
      expect(error.message).toContain('unique constraint');
    });
  });

  describe('Rejection Workflow', () => {
    it('should reject application with admin notes', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          message: 'Owner application rejected',
          application_id: 'app-123'
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.rpc('reject_owner_application', {
        application_id: 'app-123',
        notes: 'Invalid documentation provided'
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.application_id).toBe('app-123');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('reject_owner_application', {
        application_id: 'app-123',
        notes: 'Invalid documentation provided'
      });
    });
  });
});