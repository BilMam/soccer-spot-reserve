import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Log EVERYTHING pour diagnostiquer
  console.log('🧪 TEST WEBHOOK SIMPLE APPELÉ!', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

  if (req.method === 'OPTIONS') {
    console.log('📋 OPTIONS request handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body = null
    if (req.method !== 'GET') {
      const text = await req.text()
      console.log('📝 Request body:', text)
      try {
        body = JSON.parse(text)
        console.log('📊 Parsed JSON:', body)
      } catch (e) {
        console.log('⚠️ Could not parse as JSON:', e.message)
        body = text
      }
    }

    const response = {
      success: true,
      message: 'Webhook accessible et fonctionnel!',
      timestamp: new Date().toISOString(),
      method: req.method,
      received_body: body,
      headers_received: Object.fromEntries(req.headers.entries())
    }

    console.log('✅ Webhook test successful, returning:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Test webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})