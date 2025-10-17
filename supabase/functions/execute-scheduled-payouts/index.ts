import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_BATCH = 20

const fetchWithTimeout = async (url: string, options: any, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (e: any) {
    clearTimeout(id)
    if (e?.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs}ms`)
    throw e
  }
}

serve(async (_req) => {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [execute-scheduled-payouts] start`)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN')
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Missing Supabase configuration', { status: 500 })
    }

    const isTestMode = !cinetpayTransferLogin || !cinetpayTransferPwd
    if (isTestMode) console.log(`[${ts}] ⚠️ TEST MODE (no CinetPay creds)`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1) Payouts à exécuter (status=scheduled & scheduled_at <= now)
    const { data: duePayouts, error: dueErr } = await supabase
      .from('payouts')
      .select('id, booking_id, owner_id, amount, amount_net, attempt_count')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(MAX_BATCH)

    if (dueErr) throw new Error(`Fetch due payouts failed: ${dueErr.message}`)
    if (!duePayouts || duePayouts.length === 0) {
      console.log(`[${ts}] nothing due`)
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    let processed = 0

    for (const p of duePayouts) {
      const payoutId = p.id as string
      console.log(`[${ts}] processing payout ${payoutId}`)

      // 2) lock: status -> processing
      const { error: markErr } = await supabase
        .from('payouts')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', payoutId)
        .eq('status', 'scheduled')
      if (markErr) {
        console.error(`[${ts}] cannot mark processing`, markErr)
        continue
      }

      try {
        // 3) booking + owner (pour contact_id)
        const { data: bookingData, error: bookingErr } = await supabase
          .from('bookings')
          .select(`
            id,
            owner_amount,
            fields!inner (
              name,
              owners!inner ( id, phone, cinetpay_contact_id )
            )
          `)
          .eq('id', p.booking_id)
          .single()

        if (bookingErr || !bookingData) throw new Error(`Booking not found: ${bookingErr?.message}`)

        const contactId: string | null = bookingData.fields.owners?.cinetpay_contact_id ?? null
        if (!contactId) throw new Error(`Owner ${bookingData.fields.owners?.id} has no cinetpay_contact_id`)

        const amount = Math.round(Number(p.amount_net ?? p.amount ?? bookingData.owner_amount) || 0)
        if (!amount) throw new Error('Invalid amount')

        let transferResult: any
        let transferId: string | undefined

        if (isTestMode) {
          transferResult = { code: '00', success: true, message: 'Simulated (cron)', transaction_id: `test_${payoutId}` }
          transferId = transferResult.transaction_id
        } else {
          // Auth
          const authRes = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: cinetpayTransferLogin, password: cinetpayTransferPwd })
          })
          if (!authRes.ok) throw new Error(`CinetPay auth failed: ${authRes.status}`)
          const authData = await authRes.json()
          if (!authData?.success || !authData?.access_token) throw new Error(`Auth error: ${authData?.message || 'no token'}`)

          // Transfer
          const transferPayload = {
            amount,
            client_transaction_id: payoutId,
            contact_id: contactId,
            currency: 'XOF',
            description: `MySport payout (scheduled) - ${bookingData.fields.name}`
          }
          const transferRes = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/transfer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.access_token}`
            },
            body: JSON.stringify(transferPayload)
          })
          transferResult = await transferRes.json()
          transferId = transferResult?.transaction_id
        }

        const ok = !!transferResult?.success && (transferResult?.code === '00' || transferResult?.code === 0)

        // 4) update payout + booking si OK
        const { error: upErr } = await supabase
          .from('payouts')
          .update({
            status: ok ? 'completed' : 'failed',
            cinetpay_transfer_id: transferId,
            transfer_response: transferResult,
            attempt_count: (p.attempt_count ?? 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutId)
        if (upErr) console.error(`[${ts}] update payout err`, upErr)

        if (ok) {
          const { error: bookErr } = await supabase
            .from('bookings')
            .update({ payout_sent: true })
            .eq('id', p.booking_id)
          if (bookErr) console.error(`[${ts}] update booking err`, bookErr)
        }

        processed += 1
      } catch (e: any) {
        console.error(`[${ts}] payout ${p.id} failed`, e)
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            last_error: e?.message ?? 'unknown',
            attempt_count: (p.attempt_count ?? 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', p.id)
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error(`[${ts}] fatal`, e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'error' }), { status: 500 })
  }
})
