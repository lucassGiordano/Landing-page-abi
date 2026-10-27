import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatARS } from '../../lib/format.js'

const ESTADOS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
  cancelled: 'Cancelada',
}

const fecha = (valor) => (valor ? new Date(valor).toLocaleString('es-AR') : '—')

export default function ComprasPage() {
  const [compras, setCompras] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('orders')
      .select(
        'id, status, amount_cents, created_at, paid_at, mp_payment_id, profiles(email, display_name), courses(title)',
      )
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCompras(data)
      })
  }, [])

  const totalAprobado = (compras ?? [])
    .filter((c) => c.status === 'approved')
    .reduce((suma, c) => suma + c.amount_cents, 0)

  return (
    <div>
      <h3>Compras</h3>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {compras === null && !error && <p>Cargando...</p>}
      {compras?.length === 0 && <p>Todavía no hay compras.</p>}

      {compras?.length > 0 && (
        <>
          <p>
            Total aprobado (últimas {compras.length}): <strong>{formatARS(totalAprobado)}</strong>
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Fecha</th>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>ID de pago (MP)</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td>{fecha(c.created_at)}</td>
                  <td>
                    {c.profiles?.display_name ? `${c.profiles.display_name} · ` : ''}
                    {c.profiles?.email}
                  </td>
                  <td>{c.courses?.title}</td>
                  <td>{formatARS(c.amount_cents)}</td>
                  <td>{ESTADOS[c.status] ?? c.status}</td>
                  <td>{c.mp_payment_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}