import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { formatARS } from '../../lib/format.js'

export default function CursosList() {
  const [cursos, setCursos] = useState(null)
  const [error, setError] = useState('')

  async function cargar() {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug, price_ars_cents, status')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCursos(data)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function cambiarEstado(curso) {
    setError('')
    const nuevo = curso.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('courses').update({ status: nuevo }).eq('id', curso.id)
    if (error) setError('No se pudo cambiar el estado: ' + error.message)
    else cargar()
  }

  async function eliminar(curso) {
    if (!window.confirm(`¿Eliminar "${curso.title}"? Esta acción no se puede deshacer.`)) return
    setError('')
    const { error } = await supabase.from('courses').delete().eq('id', curso.id)
    if (error) {
      setError(
        error.code === '23503'
          ? 'Este curso tiene compras registradas y no se puede eliminar. Despublicalo en su lugar.'
          : 'No se pudo eliminar: ' + error.message,
      )
      return
    }
    cargar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Cursos</h3>
        <Link to="/admin/cursos/nuevo">+ Nuevo curso</Link>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {cursos === null && !error && <p>Cargando...</p>}
      {cursos?.length === 0 && <p>Todavía no hay cursos. Creá el primero.</p>}

      {cursos?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Título</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{c.title}</td>
                <td>{formatARS(c.price_ars_cents)}</td>
                <td>{c.status === 'published' ? 'Publicado' : 'Borrador'}</td>
                <td style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
                  <Link to={`/admin/cursos/${c.id}`}>Editar</Link>
                  <Link to={`/admin/cursos/${c.id}/modulos`}>Módulos</Link>
                  <button onClick={() => cambiarEstado(c)}>
                    {c.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button onClick={() => eliminar(c)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}