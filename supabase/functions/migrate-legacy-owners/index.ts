import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MigrationResult {
  success: boolean;
  message: string;
  migrated_count?: number;
  error_count?: number;
  details?: any;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [migrate-legacy-owners] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`[${timestamp}] Starting legacy owner migration...`);

    // Check for legacy owners that need migration
    const { data: legacyOwners, error: checkError } = await supabase
      .from('owners')
      .select('id, user_id, phone, status, created_at')
      .eq('status', 'pending');

    if (checkError) {
      throw new Error(`Failed to check legacy owners: ${checkError.message}`);
    }

    if (!legacyOwners || legacyOwners.length === 0) {
      console.log(`[${timestamp}] No legacy owners found to migrate`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No legacy owners found to migrate',
          migrated_count: 0,
          error_count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`[${timestamp}] Found ${legacyOwners.length} legacy owners to migrate`);

    let migrated_count = 0;
    let error_count = 0;
    const migration_details: Array<{ owner_id: string; user_id: string; phone: string; status: string; error_message?: string }> = [];

    // Process each legacy owner
    for (const owner of legacyOwners) {
      try {
        console.log(`[${timestamp}] Migrating owner: ${owner.id} (user: ${owner.user_id})`);

        // Get profile information
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', owner.user_id)
          .single();

        // Check if application already exists
        const { data: existingApp, error: appCheckError } = await supabase
          .from('owner_applications')
          .select('id')
          .eq('user_id', owner.user_id)
          .maybeSingle();

        if (appCheckError) {
          throw new Error(`Failed to check existing application: ${appCheckError.message}`);
        }

        if (existingApp) {
          console.log(`[${timestamp}] Application already exists for user ${owner.user_id}, skipping`);
          continue;
        }

        // Create owner application
        const { error: insertError } = await supabase
          .from('owner_applications')
          .insert({
            user_id: owner.user_id,
            full_name: profile?.full_name || 'Legacy Owner',
            phone: owner.phone,
            phone_payout: owner.phone, // Use same phone for payout
            phone_verified_at: owner.created_at, // Assume verified since it was in owners table
            status: 'pending',
            created_at: owner.created_at,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to create application: ${insertError.message}`);
        }

        // Mark the legacy owner as migrated
        const { error: updateError } = await supabase
          .from('owners')
          .update({
            status: 'migrated_legacy',
            updated_at: new Date().toISOString()
          })
          .eq('id', owner.id);

        if (updateError) {
          throw new Error(`Failed to update owner status: ${updateError.message}`);
        }

        migrated_count++;
        migration_details.push({
          owner_id: owner.id,
          user_id: owner.user_id,
          phone: owner.phone,
          status: 'migrated'
        });

        console.log(`[${timestamp}] Successfully migrated owner: ${owner.id}`);

      } catch (error) {
        error_count++;
        migration_details.push({
          owner_id: owner.id,
          user_id: owner.user_id,
          phone: owner.phone,
          status: 'error',
          error_message: error instanceof Error ? error.message : String(error)
        });

        console.error(`[${timestamp}] Failed to migrate owner ${owner.id}:`, error);
      }
    }

    console.log(`[${timestamp}] Migration completed. Migrated: ${migrated_count}, Errors: ${error_count}`);

    const result: MigrationResult = {
      success: true,
      message: `Legacy owner migration completed. Migrated: ${migrated_count}, Errors: ${error_count}`,
      migrated_count,
      error_count,
      details: migration_details
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Migration error:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : String(error),
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
