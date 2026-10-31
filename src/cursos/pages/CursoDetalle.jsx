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
      <div className="course-detail">
        <h2>Curso no encontrado</h2>
        <Link to="/" className="back">
          ← Volver al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="course-detail">
      <Link to="/" className="back">
        ← Volver al catálogo
      </Link>

      {curso.cover_path && <img className="hero-cover" src={coverUrl(curso.cover_path)} alt="" />}

      <div>
        <h2>{curso.title}</h2>
        {curso.description && <p className="desc">{curso.description}</p>}
      </div>

      <div>
        <h3>Temario</h3>
        {curso.modules.length === 0 ? (
          <p>El temario se publicará pronto.</p>
        ) : (
          <ol className="syllabus">
            {curso.modules.map((m) => (
              <li key={m.id}>{m.title}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="buy-box">
        <span className="price">{formatARS(curso.price_ars_cents)}</span>
        {user ? (
          <button type="button" className="btn" disabled>
            Comprar (disponible pronto)
          </button>
        ) : (
          <Link to="/login" state={{ from: location.pathname }} className="btn">
            Ingresá para comprar
          </Link>
        )}
      </div>
    </div>
  )
}