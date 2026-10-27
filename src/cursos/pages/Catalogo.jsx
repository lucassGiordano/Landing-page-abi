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
      <h2>Cursos</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {cursos === null && !error && <p>Cargando...</p>}
      {cursos?.length === 0 && <p>Todavía no hay cursos publicados.</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {cursos?.map((c) => (
          <Link
            key={c.id}
            to={`/curso/${c.slug}`}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              border: '1px solid #ddd',
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {c.cover_path ? (
              <img
                src={coverUrl(c.cover_path)}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#eee' }} />
            )}
            <div style={{ padding: 12, display: 'grid', gap: 6 }}>
              <strong>{c.title}</strong>
              {c.description && (
                <span
                  style={{
                    fontSize: 14,
                    color: '#555',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {c.description}
                </span>
              )}
              <span>{formatARS(c.price_ars_cents)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}