// mp-webhook
// Recibe las notificaciones de Mercado Pago (topic: orders), valida la firma,
// consulta el estado REAL de la order en la API y recién ahí otorga el acceso.
// Nunca se confía en lo que dice el navegador ni en el cuerpo de la notificación.

import { createClient } from 'npm:@supabase/supabase-js@2'

const MP_ORDERS_URL = 'https://api.mercadopago.com/v1/orders'

type DbOrder = {
  id: string
  user_id: string
  course_id: string
  amount_cents: number
  currency: string
  status: string
}

function parseSignatureHeader(header: string) {
  let ts = ''
  const v1: string[] = []
  for (const part of header.split(',')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key === 'ts') ts = value
    if (key === 'v1') v1.push(value)
  }
  return { ts, v1 }
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req: Request) => {
  // Mercado Pago solo envía POST. Cualquier otra cosa: 200 vacío (evita reintentos inútiles).
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceKey || !mpAccessToken || !webhookSecret) {
    console.error('Faltan variables de entorno del webhook')
    return new Response('config error', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const rawBody = await req.text()
  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    console.error('Cuerpo no es JSON válido')
    return new Response('bad body', { status: 400 })
  }

  const url = new URL(req.url)
  const dataId =
    url.searchParams.get('data.id') ??
    (body?.data as Record<string, unknown> | undefined)?.id ??
    null

  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''

  const { ts, v1 } = parseSignatureHeader(xSignature)

  // 1. Validar que el aviso venga realmente de Mercado Pago.
  //    Los IDs de orden de MP tienen mayúsculas, pero la firma se calcula sobre el
  //    manifiesto en minúsculas. Probamos primero la forma normalizada y después la
  //    exacta, para no depender de ese detalle.
  let firmaValida = false
  let firmaVariante = ''
  if (ts && v1.length > 0 && dataId) {
    const base = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const variantes: Array<[string, string]> = [
      ['minusculas', base.toLowerCase()],
      ['exacta', base],
    ]
    for (const [nombre, manifiesto] of variantes) {
      const expected = await hmacSha256Hex(webhookSecret, manifiesto)
      if (v1.some((hash) => safeEqual(hash, expected))) {
        firmaValida = true
        firmaVariante = nombre
        break
      }
    }
  }

  const { data: event, error: eventError } = await admin
    .from('payment_events')
    .insert({
      provider: 'mercadopago',
      payload: {
        body,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: {
          'x-signature': xSignature,
          'x-request-id': xRequestId,
          'user-agent': req.headers.get('user-agent'),
        },
        firma_valida: firmaValida,
        firma_variante: firmaVariante,
      },
    })
    .select('id')
    .single()

  if (eventError) console.error('No se pudo registrar payment_event', eventError)

  if (!firmaValida) {
    console.error('Firma inválida, se ignora la notificación', { dataId, ts })
    if (event) {
      await admin
        .from('payment_events')
        .update({ error: 'firma_invalida', processed_at: new Date().toISOString(), processed: false })
        .eq('id', event.id)
    }
    // 401: no procesamos. (MP reintentará, y si es un atacante, se descarta.)
    return new Response('invalid signature', { status: 401 })
  }

  if (!dataId) {
    console.error('Notificación sin data.id')
    if (event) {
      await admin
        .from('payment_events')
        .update({ error: 'sin_data_id', processed_at: new Date().toISOString(), processed: false })
        .eq('id', event.id)
    }
    return new Response('ok', { status: 200 })
  }

  const failEvent = async (msg: string) => {
    if (event) {
      await admin
        .from('payment_events')
        .update({ error: msg, processed_at: new Date().toISOString(), processed: false })
        .eq('id', event.id)
    }
  }

  // 2. Consultar el estado real de la order en Mercado Pago (no confiamos en el payload)
  let mpOrder: Record<string, unknown> | null = null
  try {
    const res = await fetch(`${MP_ORDERS_URL}/${dataId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    })
    if (!res.ok) {
      console.error('MP rechazó la consulta de la order', res.status, await res.text())
      await failEvent(`consulta_mp_${res.status}`)
      return new Response('ok', { status: 200 })
    }
    mpOrder = await res.json()
  } catch (err) {
    console.error('Error consultando la order en MP', err)
    await failEvent('error_consulta_mp')
    // 500 para que MP reintente más tarde
    return new Response('retry', { status: 500 })
  }

  const externalReference = String(mpOrder?.external_reference ?? '')
  const mpStatus = String(mpOrder?.status ?? '')
  const mpStatusDetail = String(mpOrder?.status_detail ?? '')
  const mpTotal = String(mpOrder?.total_amount ?? '')
  const mpCurrency = String(mpOrder?.currency ?? '')

  // 3. Buscar nuestra orden
  const { data: localOrder, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, course_id, amount_cents, currency, status')
    .eq('id', externalReference)
    .maybeSingle<DbOrder>()

  if (orderError) {
    console.error('Error buscando la orden local', orderError)
    await failEvent('error_busqueda_orden')
    return new Response('retry', { status: 500 })
  }
  if (!localOrder) {
    console.error('No existe orden local para external_reference', externalReference, dataId)
    await failEvent('orden_local_no_encontrada')
    return new Response('ok', { status: 200 })
  }

  // 4. Verificar monto y moneda contra NUESTRA orden
  const montoMp = Math.round(Number.parseFloat(mpTotal) * 100)
  if (!Number.isFinite(montoMp) || montoMp !== localOrder.amount_cents || mpCurrency !== 'ARS') {
    console.error('Monto/moneda no coinciden', { mpTotal, mpCurrency, esperado: localOrder })
    await admin
      .from('orders')
      .update({ status: 'rejected', mp_order_id: String(dataId) })
      .eq('id', localOrder.id)
    await failEvent('monto_o_moneda_no_coinciden')
    return new Response('ok', { status: 200 })
  }

  // 5. Aplicar el estado
  const ahora = new Date().toISOString()

  if (mpStatus === 'processed' && mpStatusDetail !== 'partially_refunded') {
    // Pago acreditado: aprobar la orden y crear la inscripción (idempotente)
    const { error: updateError } = await admin
      .from('orders')
      .update({ status: 'approved', mp_order_id: String(dataId), paid_at: ahora })
      .eq('id', localOrder.id)

    if (updateError) {
      console.error('Error aprobando la orden', updateError)
      await failEvent('error_aprobando_orden')
      return new Response('retry', { status: 500 })
    }

    const { error: enrollError } = await admin.from('enrollments').upsert(
      {
        user_id: localOrder.user_id,
        course_id: localOrder.course_id,
        order_id: localOrder.id,
        granted_at: ahora,
      },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    )

    if (enrollError) {
      console.error('Error creando la inscripción', enrollError)
      await failEvent('error_creando_inscripcion')
      return new Response('retry', { status: 500 })
    }

    if (event) {
      await admin
        .from('payment_events')
        .update({ processed: true, processed_at: ahora })
        .eq('id', event.id)
    }
    return new Response('ok', { status: 200 })
  }

  if (mpStatus === 'refunded' || mpStatusDetail === 'partially_refunded') {
    await admin
      .from('orders')
      .update({ status: 'refunded', mp_order_id: String(dataId) })
      .eq('id', localOrder.id)
    await failEvent('reembolsado')
    return new Response('ok', { status: 200 })
  }

  if (mpStatus === 'failed') {
    await admin
      .from('orders')
      .update({ status: 'rejected', mp_order_id: String(dataId) })
      .eq('id', localOrder.id)
    await failEvent(`pago_rechazado:${mpStatusDetail}`)
    return new Response('ok', { status: 200 })
  }

  if (mpStatus === 'canceled') {
    await admin
      .from('orders')
      .update({ status: 'cancelled', mp_order_id: String(dataId) })
      .eq('id', localOrder.id)
    await failEvent('cancelada')
    return new Response('ok', { status: 200 })
  }

  // created / action_required / processing: todavía no hay nada que acreditar
  await admin
    .from('orders')
    .update({ mp_order_id: String(dataId) })
    .eq('id', localOrder.id)
  await failEvent(`sin_accion:${mpStatus}`)
  return new Response('ok', { status: 200 })
})
