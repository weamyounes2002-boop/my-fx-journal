// Supabase Edge Function: Disconnect MT5 Account via MetaAPI REST API
// Deno runtime - replaces Express DELETE /api/metaapi/disconnect/:connectionId

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
};

const METAAPI_PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.ai';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Get connection ID from URL
    const url = new URL(req.url);
    const connectionId = url.pathname.split('/').pop();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID required', statusCode: 400 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', statusCode: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', statusCode: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('mt_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found', statusCode: 404 }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove MetaAPI account via REST API
    if (connection.metaapi_account_id) {
      try {
        const metaapiToken = Deno.env.get('METAAPI_TOKEN');
        if (metaapiToken) {
          // Undeploy account first
          await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${connection.metaapi_account_id}/undeploy`, {
            method: 'POST',
            headers: {
              'auth-token': metaapiToken,
            },
          });

          // Delete account
          const deleteResponse = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${connection.metaapi_account_id}`, {
            method: 'DELETE',
            headers: {
              'auth-token': metaapiToken,
            },
          });

          if (deleteResponse.ok) {
            console.log('[Edge Function] MetaAPI account removed:', connection.metaapi_account_id);
          }
        }
      } catch (error) {
        console.warn('[Edge Function] Failed to remove MetaAPI account:', error);
        // Continue with database deletion even if MetaAPI removal fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('mt_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to disconnect', statusCode: 500, details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { connection_id: connectionId },
        message: 'MT account disconnected successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Edge Function] Disconnect error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        statusCode: 500, 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});