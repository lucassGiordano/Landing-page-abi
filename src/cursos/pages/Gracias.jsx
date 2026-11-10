import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

// Cada cuánto y cuántas veces consultamos si el webhook ya creó la inscripción.
const ESPERA_MS = 2500
const INTENTOS = 8

const CONTENIDO = {
  verificando: {
    icono: '⏳',
    titulo: 'Estamos confirmando tu pago',
    texto: 'Tarda unos segundos. No cierres esta página.',
  },
  conAcceso: {
    icono: '✓',
    titulo: '¡Listo! Ya tenés acceso',
    texto: 'Tu pago se acreditó y el curso ya está habilitado en "Mis cursos".',
  },
  sinAccesoAun: {
    icono: '⏳',
    titulo: 'Tu pago está siendo confirmado',
    texto:
      'Mercado Pago nos avisó del pago, pero la confirmación todavía no llegó. Suele tardar menos de un minuto: revisá "Mis cursos" en un rato.',
  },
  rechazado: {
    icono: '✕',
    titulo: 'El pago no se completó',
    texto:
      'Mercado Pago rechazó la operación y no se te cobró nada. Podés intentarlo de nuevo con otro medio de pago.',
  },
  pendiente: {
    icono: '⏳',
    titulo: 'Tu pago quedó pendiente',
    texto:
      'Cuando Mercado Pago lo confirme, el curso se va a habilitar solo en "Mis cursos". No hace falta que hagas nada más.',
  },
  sinSesion: {
    icono: '🔒',
    titulo: 'Iniciá sesión para ver tu curso',
    texto: 'El pago se registró. Iniciá sesión con la misma cuenta que usaste para comprar.',
  },
  desconocido: {
    icono: '✓',
    titulo: 'Gracias por tu compra',
    texto: 'Si el pago se acreditó, el curso va a aparecer en "Mis cursos".',
  },
}

export default function Gracias() {
  const [params] = useSearchParams()
  const { user, loading } = useAuth()
  const [estado, setEstado] = useState('verificando')

  // Nuestro `result` viene de las URLs de retorno que configuramos en la orden.
  // `status` / `collection_status` los agrega Mercado Pago en la redirección.
  const resultado =
    params.get('result') ?? params.get('status') ?? params.get('collection_status') ?? ''

  const aprobado = resultado === 'success' || resultado === 'approved'
  const rechazado = resultado === 'failure' || resultado === 'rejected'
  const pendiente = resultado === 'pending' || resultado === 'in_process'

  useEffect(() => {
    if (loading) return

    if (rechazado) {
      setEstado('rechazado')
      return
    }
    if (pendiente) {
      setEstado('pendiente')
      return
    }
    if (!aprobado) {
      setEstado('desconocido')
      return
    }
    if (!user) {
      setEstado('sinSesion')
      return
    }

    // El acceso NO lo da esta página: solo consulta si el webhook ya lo creó.
    let cancelado = false
    let timer = null
    let intentos = 0

    async function comprobar() {
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id, granted_at')
        .eq('user_id', user.id)
        .order('granted_at', { ascending: false })
        .limit(1)

      if (cancelado) return

      if (!error && data?.length > 0) {
        setEstado('conAcceso')
        return
      }

      intentos += 1
      if (intentos < INTENTOS) {
        timer = setTimeout(comprobar, ESPERA_MS)
      } else {
        setEstado('sinAccesoAun')
      }
    }

    setEstado('verificando')
    comprobar()

    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
    }
  }, [aprobado, rechazado, pendiente, user, loading])

  const c = CONTENIDO[estado]

  return (
    <div className="gracias">
      <div className="page-head">
        <span className="eyebrow">Cuerpo Raíz · Abigail Vajda</span>
        <span className="estado-icono" aria-hidden="true">
          {c.icono}
        </span>
        <h2>{c.titulo}</h2>
      </div>

      <p>{c.texto}</p>

      <div className="gracias-acciones">
        {estado === 'conAcceso' && (
          <Link to="/mis-cursos" className="btn">
            Ir a mis cursos
          </Link>
        )}

        {estado === 'sinAccesoAun' && (
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Volver a comprobar
          </button>
        )}

        {estado === 'sinSesion' && (
          <Link to="/login" state={{ from: '/mis-cursos' }} className="btn">
            Iniciar sesión
          </Link>
        )}

        {estado === 'rechazado' && (
          <Link to="/" className="btn">
            Volver al catálogo
          </Link>
        )}

        {estado !== 'conAcceso' && estado !== 'sinSesion' && (
          <Link to="/mis-cursos" className="btn">
            Ver mis cursos
          </Link>
        )}
      </div>
    </div>
  )
}
