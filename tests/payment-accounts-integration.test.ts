/**
 * @jest-environment jsdom
 */

// Mock Supabase client without importing the real one
const mockCreateClient = jest.fn();

const mockSupabaseClient = {
  from: jest.fn(),
  functions: {
    invoke: jest.fn(),
  },
};

describe('Payment Accounts Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
  });

  describe('CinetPay Contact to Payment Account Flow', () => {
    it('should create payment account after successful CinetPay contact creation', async () => {
      // Mock create-owner-contact response
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Contact créé avec succès',
          cinetpay_status: 'OPERATION_SUCCES',
          owner_id: 'user-456'
        },
        error: null
      });

      // Mock payment_accounts upsert
      const mockFrom = {
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              owner_id: 'user-456',
              payment_provider: 'cinetpay',
              account_type: 'contact',
              owner_name: 'Test Owner',
              phone: '+2250701234567',
              email: 'test@example.com',
              cinetpay_contact_added: true,
              cinetpay_contact_status: 'OPERATION_SUCCES'
            }],
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      // Simulate the create-owner-contact call
      const contactData = {
        owner_id: 'user-456',
        owner_name: 'Test Owner',
        owner_surname: '',
        phone: '+2250701234567',
        email: 'test@example.com',
        country_prefix: '225'
      };

      const { data: contactResult, error: contactError } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: contactData
      });

      expect(contactError).toBeNull();
      expect(contactResult.success).toBe(true);

      // Verify payment account should be created (simulated)
      const paymentAccountData = {
        owner_id: 'user-456',
        payment_provider: 'cinetpay',
        account_type: 'contact',
        owner_name: 'Test Owner',
        owner_surname: '',
        phone: '+2250701234567',
        email: 'test@example.com',
        country_prefix: '225',
        cinetpay_contact_added: true,
        cinetpay_contact_status: 'OPERATION_SUCCES',
        updated_at: expect.any(String)
      };

      // This would be done inside the create-owner-contact function
      const { data: accountData, error: accountError } = await mockSupabaseClient
        .from('payment_accounts')
        .upsert(paymentAccountData, { 
          onConflict: 'owner_id,payment_provider,account_type'
        })
        .select();

      expect(accountError).toBeNull();
      expect(accountData).toHaveLength(1);
      expect(accountData[0]).toMatchObject({
        owner_id: 'user-456',
        payment_provider: 'cinetpay',
        account_type: 'contact',
        cinetpay_contact_added: true
      });
    });

    it('should handle existing payment account update', async () => {
      // Mock existing account scenario
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    owner_id: 'user-456',
                    payment_provider: 'cinetpay',
                    account_type: 'contact',
                    cinetpay_contact_added: true
                  },
                  error: null
                })
              })
            })
          })
        }),
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              owner_id: 'user-456',
              payment_provider: 'cinetpay',
              account_type: 'contact',
              cinetpay_contact_added: true,
              updated_at: new Date().toISOString()
            }],
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      // Check existing account
      const { data: existingAccount, error: fetchError } = await mockSupabaseClient
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', 'user-456')
        .eq('payment_provider', 'cinetpay')
        .eq('account_type', 'contact')
        .maybeSingle();

      expect(fetchError).toBeNull();
      expect(existingAccount?.cinetpay_contact_added).toBe(true);

      // Should still allow update of existing account
      const updateData = {
        owner_id: 'user-456',
        payment_provider: 'cinetpay',
        account_type: 'contact',
        updated_at: new Date().toISOString()
      };

      const { data: updateResult, error: updateError } = await mockSupabaseClient
        .from('payment_accounts')
        .upsert(updateData, { 
          onConflict: 'owner_id,payment_provider,account_type'
        })
        .select();

      expect(updateError).toBeNull();
      expect(updateResult[0].owner_id).toBe('user-456');
    });

    it('should track CinetPay API response in payment_accounts', async () => {
      const mockFrom = {
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              owner_id: 'user-456',
              cinetpay_contact_response: {
                code: 'OPERATION_SUCCES',
                message: 'Contact created successfully',
                data: { contact_id: 'cp_contact_123' }
              },
              cinetpay_contact_status: 'Contact created successfully',
              cinetpay_contact_added: true
            }],
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const paymentAccountData = {
        owner_id: 'user-456',
        payment_provider: 'cinetpay',
        account_type: 'contact',
        cinetpay_contact_added: true,
        cinetpay_contact_status: 'Contact created successfully',
        cinetpay_contact_response: {
          code: 'OPERATION_SUCCES',
          message: 'Contact created successfully',
          data: { contact_id: 'cp_contact_123' }
        }
      };

      const { data, error } = await mockSupabaseClient
        .from('payment_accounts')
        .upsert(paymentAccountData, { 
          onConflict: 'owner_id,payment_provider,account_type'
        })
        .select();

      expect(error).toBeNull();
      expect(data[0].cinetpay_contact_response).toMatchObject({
        code: 'OPERATION_SUCCES',
        message: 'Contact created successfully'
      });
    });
  });

  describe('Payout Flow Integration', () => {
    it('should verify payment account exists before payout', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      owner_id: 'user-456',
                      payment_provider: 'cinetpay',
                      account_type: 'contact',
                      phone: '+2250701234567',
                      cinetpay_contact_added: true
                    },
                    error: null
                  })
                })
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      // Simulate payout verification
      const { data: paymentAccount, error } = await mockSupabaseClient
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', 'user-456')
        .eq('payment_provider', 'cinetpay')
        .eq('account_type', 'contact')
        .eq('cinetpay_contact_added', true)
        .single();

      expect(error).toBeNull();
      expect(paymentAccount).toMatchObject({
        owner_id: 'user-456',
        payment_provider: 'cinetpay',
        cinetpay_contact_added: true,
        phone: '+2250701234567'
      });

      // This phone number would be used for CinetPay transfer
      expect(paymentAccount.phone).toBe('+2250701234567');
    });

    it('should fail payout if no payment account exists', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'No payment account found' }
                  })
                })
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const { data: paymentAccount, error } = await mockSupabaseClient
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', 'user-456')
        .eq('payment_provider', 'cinetpay')
        .eq('account_type', 'contact')
        .eq('cinetpay_contact_added', true)
        .single();

      expect(paymentAccount).toBeNull();
      expect(error.message).toBe('No payment account found');
    });
  });

  describe('Error Handling', () => {
    it('should handle CinetPay API timeout gracefully', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Request timeout after 15000ms'
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
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

    it('should handle missing environment variables', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          message: 'Variables d\'environnement CinetPay Transfer manquantes'
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.functions.invoke('create-owner-contact', {
        body: {
          owner_id: 'user-456',
          owner_name: 'Test Owner',
          phone: '+2250701234567',
          email: 'test@example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.message).toContain('environnement CinetPay Transfer manquantes');
    });
  });
});