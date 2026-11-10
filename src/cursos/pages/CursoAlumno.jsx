import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import VideoPlayer from '../components/VideoPlayer.jsx'

const ETIQUETA = { text: 'Texto', pdf: 'PDF', doc: 'Documento', image: 'Imagen', video: 'Video' }

// Enlace firmado de corta duración: el archivo vive en un bucket privado
// y el alumno solo lo puede pedir si la RLS le da acceso al curso.
const SEGUNDOS_ENLACE = 120

function VisorArchivo({ contenido }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setUrl('')
    setError('')

    supabase.storage
      .from('course-files')
      .createSignedUrl(contenido.storage_path, SEGUNDOS_ENLACE)
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) setError('No se pudo preparar el archivo: ' + error.message)
        else setUrl(data.signedUrl)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [contenido.id, contenido.storage_path])

  if (cargando) return <p>Preparando el archivo...</p>
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>

  if (contenido.type === 'image') {
    return <img className="aula-imagen" src={url} alt={contenido.title} />
  }

  if (contenido.type === 'pdf') {
    return (
      <div>
        <iframe className="aula-pdf" src={url} title={contenido.title} />
        <p className="aula-nota">
          ¿No se ve?{' '}
          <a href={url} target="_blank" rel="noreferrer">
            Abrir el PDF en una pestaña nueva
          </a>
          . El enlace vence en 2 minutos.
        </p>
      </div>
    )
  }

  return (
    <div>
      <a className="btn" href={url} target="_blank" rel="noreferrer">
        Descargar archivo
      </a>
      <p className="aula-nota">El enlace vence en 2 minutos. Volvé a entrar si lo necesitás de nuevo.</p>
    </div>
  )
}

function VisorLeccion({ contenido }) {
  if (contenido.type === 'text') {
    return (
      <div className="aula-texto">
        <ReactMarkdown>{contenido.body_md ?? ''}</ReactMarkdown>
      </div>
    )
  }

  if (contenido.type === 'video') {
    return (
      <div className="aula-video">
        <VideoPlayer
          provider={contenido.video_provider}
          videoRef={contenido.video_ref}
          title={contenido.title}
        />
      </div>
    )
  }

  if (contenido.storage_path) return <VisorArchivo contenido={contenido} />

  return <p>Este contenido todavía no tiene material cargado.</p>
}

export default function CursoAlumno() {
  const { slug } = useParams()
  const { user, loading, profileLoading, isAdmin } = useAuth()

  const [estado, setEstado] = useState('cargando') // cargando | listo | sinAcceso | sinCurso | error
  const [error, setError] = useState('')
  const [curso, setCurso] = useState(null)
  const [modulos, setModulos] = useState([])
  const [leccionId, setLeccionId] = useState(null)
  const [completadas, setCompletadas] = useState(() => new Set()) // ids de lecciones hechas
  const [guardandoProgreso, setGuardandoProgreso] = useState(false)
  const [errorProgreso, setErrorProgreso] = useState('')

  useEffect(() => {
    // Esperamos a saber si es admin: el perfil llega después de la sesión
    if (loading || profileLoading || !user) return
    let cancelado = false
    setEstado('cargando')
    setError('')

    async function cargar() {
      // 1. El curso, solo si está publicado
      const { data: cursoData, error: errCurso } = await supabase
        .from('courses')
        .select('id, slug, title, description')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (cancelado) return
      if (errCurso) {
        setError(errCurso.message)
        setEstado('error')
        return
      }
      if (!cursoData) {
        setEstado('sinCurso')
        return
      }
      setCurso(cursoData)

      // 2. ¿Compró el curso? El admin puede ver todo sin inscripción.
      //    Ojo: quien decide de verdad es la RLS; esto es solo para el mensaje.
      let inscripto = isAdmin
      if (!isAdmin) {
        const { data: inscripcion, error: errInscripcion } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('course_id', cursoData.id)
          .maybeSingle()

        if (cancelado) return
        if (errInscripcion) {
          // No bloqueamos por esto: la RLS de `contents` es la que manda.
          console.error('No se pudo leer la inscripción', errInscripcion)
        } else {
          inscripto = Boolean(inscripcion)
        }
      }

      // 3. Módulos en orden
      const { data: modulosData, error: errModulos } = await supabase
        .from('modules')
        .select('id, title, position')
        .eq('course_id', cursoData.id)
        .order('position')

      if (cancelado) return
      if (errModulos) {
        setError(errModulos.message)
        setEstado('error')
        return
      }

      // 4. Contenidos de esos módulos (la RLS los oculta si no hay acceso)
      const ids = (modulosData ?? []).map((m) => m.id)
      let contenidos = []

      if (ids.length) {
        const { data: contData, error: errCont } = await supabase
          .from('contents')
          .select(
            'id, module_id, type, title, position, body_md, storage_path, video_provider, video_ref',
          )
          .in('module_id', ids)
          .order('position')

        if (cancelado) return
        if (errCont) {
          setError(errCont.message)
          setEstado('error')
          return
        }
        contenidos = contData ?? []
      }

      const armado = (modulosData ?? []).map((m) => ({
        ...m,
        contenidos: contenidos.filter((c) => c.module_id === m.id),
      }))

      // Sin ningún contenido visible: o no compró, o el curso está vacío.
      // La RLS ya filtró los contenidos, así que si no queda nada no hay acceso.
      if (armado.every((m) => m.contenidos.length === 0)) {
        setModulos(armado)
        setEstado(inscripto ? 'listo' : 'sinAcceso')
        return
      }

      setModulos(armado)
      setLeccionId(armado.flatMap((m) => m.contenidos)[0]?.id ?? null)

      // 5. Qué lecciones ya marcó como completadas
      const { data: progreso, error: errProgreso } = await supabase
        .from('progress')
        .select('content_id')
        .eq('user_id', user.id)

      if (cancelado) return
      if (errProgreso) {
        console.error('No se pudo leer el progreso', errProgreso)
      } else {
        setCompletadas(new Set((progreso ?? []).map((p) => p.content_id)))
      }

      setEstado('listo')
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [slug, user, loading, profileLoading, isAdmin])

  const leccion = useMemo(
    () => modulos.flatMap((m) => m.contenidos).find((c) => c.id === leccionId) ?? null,
    [modulos, leccionId],
  )

  const totalLecciones = useMemo(
    () => modulos.reduce((n, m) => n + m.contenidos.length, 0),
    [modulos],
  )
  const hechas = useMemo(
    () => modulos.reduce((n, m) => n + m.contenidos.filter((c) => completadas.has(c.id)).length, 0),
    [modulos, completadas],
  )

  // Marcar o desmarcar una lección. La tabla `progress` tiene PK
  // (user_id, content_id), así que la base nunca guarda un duplicado.
  async function alternarCompletada(contenido) {
    if (!user || guardandoProgreso) return
    const yaEstaba = completadas.has(contenido.id)

    setErrorProgreso('')
    setGuardandoProgreso(true)

    const { error } = yaEstaba
      ? await supabase
          .from('progress')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', contenido.id)
      : await supabase.from('progress').upsert(
          {
            user_id: user.id,
            content_id: contenido.id,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,content_id' },
        )

    setGuardandoProgreso(false)

    if (error) {
      setErrorProgreso('No se pudo guardar el avance: ' + error.message)
      return
    }

    setCompletadas((prev) => {
      const nuevo = new Set(prev)
      if (yaEstaba) nuevo.delete(contenido.id)
      else nuevo.add(contenido.id)
      return nuevo
    })
  }

  if (estado === 'cargando') return <p>Cargando el curso...</p>

  if (estado === 'error') {
    return (
      <div className="aula">
        <p style={{ color: 'crimson' }}>{error}</p>
        <Link to="/mis-cursos" className="btn">
          Ir a mis cursos
        </Link>
      </div>
    )
  }

  if (estado === 'sinCurso') {
    return (
      <div className="aula">
        <h2>Curso no encontrado</h2>
        <Link to="/" className="btn">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (estado === 'sinAcceso') {
    return (
      <div className="aula aula-aviso">
        <span className="estado-icono" aria-hidden="true">
          🔒
        </span>
        <h2>Todavía no tenés acceso a este curso</h2>
        <p>
          El contenido se habilita cuando Mercado Pago confirma el pago. Si acabás de comprar,
          esperá unos segundos y volvé a entrar.
        </p>
        <div className="gracias-acciones">
          <Link to={`/curso/${curso?.slug ?? slug}`} className="btn">
            Ver el curso
          </Link>
          <Link to="/mis-cursos" className="btn">
            Ir a mis cursos
          </Link>
        </div>
      </div>
    )
  }

  if (modulos.length === 0) {
    return (
      <div className="aula aula-aviso">
        <h2>{curso?.title}</h2>
        <p>El contenido del curso se está preparando. Volvé pronto.</p>
        <Link to={`/curso/${curso?.slug ?? slug}`} className="btn">
          Volver al curso
        </Link>
      </div>
    )
  }

  return (
    <div className="aula">
      <aside className="aula-indice">
        <Link to={`/curso/${curso?.slug ?? slug}`} className="back">
          ← Volver al curso
        </Link>
        <h2>{curso?.title}</h2>

        {totalLecciones > 0 && (
          <div className="progreso aula-progreso">
            <div className="progreso-barra">
              <span style={{ width: `${Math.round((hechas / totalLecciones) * 100)}%` }} />
            </div>
            <span className="progreso-texto">
              {hechas} de {totalLecciones} completadas
            </span>
          </div>
        )}

        {modulos.map((m) => (
          <div className="aula-modulo" key={m.id}>
            <h3>
              <span className="aula-numero">{m.position}</span> {m.title}
            </h3>
            {m.contenidos.length === 0 ? (
              <p className="aula-vacio">Sin lecciones todavía</p>
            ) : (
              <ul>
                {m.contenidos.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={c.id === leccionId ? 'aula-leccion activa' : 'aula-leccion'}
                      onClick={() => setLeccionId(c.id)}
                    >
                      <span className="aula-tipo">{ETIQUETA[c.type] ?? c.type}</span>
                      <span className="aula-leccion-titulo">{c.title}</span>
                      {completadas.has(c.id) && (
                        <span className="aula-check" aria-label="completada">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </aside>

      <section className="aula-panel">
        {leccion ? (
          <>
            <header className="aula-cabecera">
              <span className="aula-tipo">{ETIQUETA[leccion.type] ?? leccion.type}</span>
              <h2>{leccion.title}</h2>
              <div className="aula-acciones">
                <button
                  type="button"
                  className={completadas.has(leccion.id) ? 'aula-completar hecha' : 'aula-completar'}
                  onClick={() => alternarCompletada(leccion)}
                  disabled={guardandoProgreso}
                >
                  {completadas.has(leccion.id) ? '✓ Completada' : 'Marcar como completada'}
                </button>
                {errorProgreso && <p className="aula-error">{errorProgreso}</p>}
              </div>
            </header>
            <VisorLeccion contenido={leccion} />
          </>
        ) : (
          <p>Elegí una lección del índice para empezar.</p>
        )}
      </section>
    </div>
  )
}
