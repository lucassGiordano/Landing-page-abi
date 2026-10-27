import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { coverUrl, formatARS } from '../lib/format.js'

export default function CursoDetalle() {
  const { slug } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [curso, setCurso] = useState(undefined) // undefined = cargando, null = no existe
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, title, description, price_ars_cents, cover_path, modules(id, title, position)')
      .eq('slug', slug)
      .eq('status', 'published')
      .order('position', { referencedTable: 'modules', ascending: true })
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setCurso(data ?? null)
      })
  }, [slug])

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>
  if (curso === undefined) return <p>Cargando...</p>
  if (curso === null) {
    return (
      <div>
        <h2>Curso no encontrado</h2>
        <p>
          <Link to="/">← Volver al catálogo</Link>
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <p style={{ margin: 0 }}>
        <Link to="/">← Volver al catálogo</Link>
      </p>
      {curso.cover_path && (
        <img
          src={coverUrl(curso.cover_path)}
          alt=""
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 6 }}
        />
      )}
      <h2 style={{ margin: 0 }}>{curso.title}</h2>
      {curso.description && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{curso.description}</p>}

      <div>
        <h3>Temario</h3>
        {curso.modules.length === 0 ? (
          <p>El temario se publicará pronto.</p>
        ) : (
          <ol>
            {curso.modules.map((m) => (
              <li key={m.id}>{m.title}</li>
            ))}
          </ol>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <strong style={{ fontSize: 20 }}>{formatARS(curso.price_ars_cents)}</strong>
        {user ? (
          <button disabled>Comprar (disponible pronto)</button>
        ) : (
          <Link to="/login" state={{ from: location.pathname }}>
            Ingresá para comprar
          </Link>
        )}
      </div>
    </div>
  )
}