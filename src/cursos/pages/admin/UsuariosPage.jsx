import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString('es-AR') : '—')

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at, enrollments(count)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setUsuarios(data)
      })
  }, [])

  return (
    <div>
      <h3>Usuarios{usuarios ? ` (${usuarios.length})` : ''}</h3>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {usuarios === null && !error && <p>Cargando...</p>}

      {usuarios?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Cursos</th>
              <th>Alta</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{u.display_name || '—'}</td>
                <td>{u.email}</td>
                <td>{u.role === 'admin' ? 'Admin' : 'Cliente'}</td>
                <td>{u.enrollments?.[0]?.count ?? 0}</td>
                <td>{fecha(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}