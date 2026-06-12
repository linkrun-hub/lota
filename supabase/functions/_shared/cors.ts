/**
 * supabase/functions/_shared/cors.ts
 * Headers CORS para todas as Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
