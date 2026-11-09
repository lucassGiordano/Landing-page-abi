// create-checkout
// Crea una orden de pago en Mercado Pago (Checkout Pro · API Orders) y devuelve el checkout_url.
// El precio SIEMPRE se lee de la base; nunca se acepta un monto enviado por el navegador.
// El acceso al curso NO se otorga acá: eso lo hace el webhook (mp-webhook) cuando el pago se acredita.

import { createClient } from 'npm:@supabase/supabase-js@2'

const MP_ORDERS_URL = 'https://api.mercadopago.com/v1/orders'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Necesitás iniciar sesión' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Faltan variables internas de Supabase')
    return json({ error: 'Configuración incompleta del servidor' }, 500)
  }
  if (!mpAccessToken) {
    console.error('Falta el secreto MP_ACCESS_TOKEN')
    return json({ error: 'Falta configurar Mercado Pago' }, 500)
  }

  // 1. ¿Quién es el usuario? (se valida el JWT contra Supabase Auth)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'Sesión inválida o vencida' }, 401)
  const user = userData.user

  // 2. Datos de entrada
  let courseId = ''
  try {
    const body = await req.json()
    courseId = String(body?.courseId ?? '').trim()
  } catch {
    return json({ error: 'Cuerpo de la petición inválido' }, 400)
  }
  if (!courseId) return json({ error: 'Falta el curso' }, 400)

  // Cliente con service_role: puede escribir orders/enrollments (el navegador no puede)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // 3. Curso y precio, desde la base
  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('id, title, price_ars_cents, status')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) {
    console.error('Error leyendo curso', courseError)
    return json({ error: 'No se pudo leer el curso' }, 500)
  }
  if (!course) return json({ error: 'El curso no existe' }, 404)
  if (course.status !== 'published') return json({ error: 'El curso no está a la venta' }, 400)
  if (!course.price_ars_cents || course.price_ars_cents <= 0) {
    return json({ error: 'El curso no tiene un precio válido' }, 400)
  }

  // 4. ¿Ya lo compró?
  const { data: enrollment, error: enrollmentError } = await admin
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (enrollmentError) {
    console.error('Error leyendo inscripción', enrollmentError)
    return json({ error: 'No se pudo verificar el acceso' }, 500)
  }
  if (enrollment) return json({ error: 'Ya tenés acceso a este curso' }, 409)

  // 5. Orden propia en pending (el monto sale de acá, no del navegador)
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      course_id: course.id,
      amount_cents: course.price_ars_cents,
      currency: 'ARS',
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Error creando orden', orderError)
    return json({ error: 'No se pudo crear la orden' }, 500)
  }

  // 6. Crear la orden en Mercado Pago
  const amount = (course.price_ars_cents / 100).toFixed(2)
  const baseUrl = (Deno.env.get('APP_BASE_URL') ?? 'https://abigailvajdacuerporaiz.com.ar')
    .replace(/\/+$/, '')

  const mpPayload = {
    type: 'online',
    processing_mode: 'manual',
    total_amount: amount,
    external_reference: order.id,
    items: [
      {
        title: course.title,
        quantity: 1,
        unit_price: amount,
      },
    ],
    payer: { email: user.email ?? undefined },
    config: {
      online: {
        success_url: `${baseUrl}/cursos/gracias?result=success`,
        failure_url: `${baseUrl}/cursos/gracias?result=failure`,
        pending_url: `${baseUrl}/cursos/gracias?result=pending`,
        auto_return: 'approved',
      },
    },
  }

  let mpResponse: Response
  try {
    mpResponse = await fetch(MP_ORDERS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(mpPayload),
    })
  } catch (err) {
    console.error('No se pudo contactar a Mercado Pago', err)
    await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return json({ error: 'No se pudo contactar a Mercado Pago' }, 502)
  }

  const mpData = await mpResponse.json().catch(() => null)

  if (!mpResponse.ok || !mpData?.id || !mpData?.checkout_url) {
    console.error('Mercado Pago rechazó la orden', mpResponse.status, JSON.stringify(mpData))
    await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return json(
      {
        error: 'Mercado Pago rechazó la operación',
        detail: mpData?.message ?? mpData?.error ?? null,
      },
      502,
    )
  }

  // 7. Guardar el id de la orden de MP
  const { error: updateError } = await admin
    .from('orders')
    .update({ mp_order_id: String(mpData.id) })
    .eq('id', order.id)

  if (updateError) {
    // No cortamos: el pago puede completarse igual. El webhook buscará por external_reference.
    console.error('No se pudo guardar mp_order_id', updateError)
  }

  return json({ checkoutUrl: mpData.checkout_url, orderId: order.id })
})
