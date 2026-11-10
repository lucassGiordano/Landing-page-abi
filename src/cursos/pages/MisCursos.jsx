import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { coverUrl } from '../lib/format.js'

export default function MisCursos() {
  const { user, loading, profileLoading } = useAuth()
  const [cursos, setCursos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || profileLoading || !user) return
    let cancelado = false

    async function cargar() {
      // Dos consultas: los cursos comprados (con sus módulos y lecciones) y
      // las lecciones que este usuario ya marcó como completadas.
      const [inscripciones, progreso] = await Promise.all([
        supabase
          .from('enrollments')
          .select(
            'granted_at, courses(id, slug, title, description, cover_path, modules(id, position, contents(id)))',
          )
          .eq('user_id', user.id)
          .order('granted_at', { ascending: false }),
        supabase.from('progress').select('content_id').eq('user_id', user.id),
      ])

      if (cancelado) return

      if (inscripciones.error) {
        setError(inscripciones.error.message)
        setCursos([])
        return
      }

      // Si el progreso no se puede leer, la lista igual se muestra, sin avance.
      const completadas = new Set((progreso.data ?? []).map((p) => p.content_id))

      const lista = (inscripciones.data ?? [])
        .filter((e) => e.courses) // curso borrado o no visible: se omite
        .map((e) => {
          const lecciones = (e.courses.modules ?? []).flatMap((m) => m.contents ?? [])
          const hechas = lecciones.filter((l) => completadas.has(l.id)).length
          return {
            ...e.courses,
            granted_at: e.granted_at,
            total: lecciones.length,
            hechas,
          }
        })

      setCursos(lista)
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [user, loading, profileLoading])

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Cuerpo Raíz · Abigail Vajda</span>
        <h2>Mis cursos</h2>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {cursos === null && !error && <p>Cargando...</p>}

      {cursos?.length === 0 && (
        <div className="mis-cursos-vacio">
          <p>Todavía no tenés cursos comprados.</p>
          <Link to="/" className="btn">
            Ver el catálogo
          </Link>
        </div>
      )}

      {cursos?.length > 0 && (
        <div className="course-grid">
          {cursos.map((c) => {
            const porcentaje = c.total ? Math.round((c.hechas / c.total) * 100) : 0
            return (
              <Link key={c.id} to={`/curso/${c.slug}/aprender`} className="course-card">
                {c.cover_path ? (
                  <img className="cover" src={coverUrl(c.cover_path)} alt="" />
                ) : (
                  <div className="cover-placeholder" />
                )}
                <div className="body">
                  <h3>{c.title}</h3>
                  {c.description && <span className="desc">{c.description}</span>}

                  {c.total > 0 ? (
                    <div className="progreso">
                      <div className="progreso-barra">
                        <span style={{ width: `${porcentaje}%` }} />
                      </div>
                      <span className="progreso-texto">
                        {c.hechas} de {c.total} lecciones · {porcentaje}%
                      </span>
                    </div>
                  ) : (
                    <span className="progreso-texto">Contenido en preparación</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
