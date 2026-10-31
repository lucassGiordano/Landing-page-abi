import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { coverUrl, formatARS } from '../lib/format.js'

export default function Catalogo() {
  const [cursos, setCursos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, slug, title, description, price_ars_cents, cover_path')
      .eq('status', 'published') // importante: el admin también puede leer borradores
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCursos(data)
      })
  }, [])

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Cuerpo Raíz · Abigail Vajda</span>
        <h2>Cursos</h2>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {cursos === null && !error && <p>Cargando...</p>}
      {cursos?.length === 0 && <p>Todavía no hay cursos publicados.</p>}

      <div className="course-grid">
        {cursos?.map((c) => (
          <Link key={c.id} to={`/curso/${c.slug}`} className="course-card">
            {c.cover_path ? (
              <img className="cover" src={coverUrl(c.cover_path)} alt="" />
            ) : (
              <div className="cover-placeholder" />
            )}
            <div className="body">
              <h3>{c.title}</h3>
              {c.description && <span className="desc">{c.description}</span>}
              <span className="price">{formatARS(c.price_ars_cents)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}