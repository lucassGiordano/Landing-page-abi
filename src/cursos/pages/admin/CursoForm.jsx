import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { slugify } from '../../lib/format.js'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export default function CursoForm() {
  const { id } = useParams()
  const esNuevo = !id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [precio, setPrecio] = useState(0)
  const [status, setStatus] = useState('draft')
  const [cargando, setCargando] = useState(!esNuevo)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (esNuevo) return
    supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('No se encontró el curso.')
        } else {
          setTitle(data.title)
          setSlug(data.slug)
          setSlugManual(true)
          setDescription(data.description ?? '')
          setPrecio(data.price_ars_cents / 100)
          setStatus(data.status)
        }
        setCargando(false)
      })
  }, [id, esNuevo])

  function onTitleChange(valor) {
    setTitle(valor)
    if (!slugManual) setSlug(slugify(valor))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setAviso('')

    const t = title.trim()
    const s = slug.trim()
    const pesos = Number(precio)
    if (!t) return setError('El título es obligatorio.')
    if (!SLUG_RE.test(s))
      return setError('El slug solo admite minúsculas, números y guiones (ej: mi-primer-curso).')
    if (!Number.isInteger(pesos) || pesos < 0)
      return setError('El precio debe ser un número entero de pesos (0 o mayor).')

    const payload = {
      title: t,
      slug: s,
      description: description.trim() || null,
      price_ars_cents: pesos * 100,
    }
    if (esNuevo) payload.created_by = user.id

    setBusy(true)
    const consulta = esNuevo
      ? supabase.from('courses').insert(payload).select('id').single()
      : supabase.from('courses').update(payload).eq('id', id).select('id').single()
    const { data, error } = await consulta
    setBusy(false)

    if (error) {
      setError(
        error.code === '23505'
          ? 'Ya existe un curso con ese slug.'
          : 'No se pudo guardar: ' + error.message,
      )
      return
    }
    if (esNuevo) navigate(`/admin/cursos/${data.id}`, { replace: true })
    else setAviso('Cambios guardados.')
  }

  if (cargando) return <p>Cargando...</p>

  return (
    <form onSubmit={guardar} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
      <p style={{ margin: 0 }}>
        <Link to="/admin/cursos">← Volver a cursos</Link>
      </p>
      <h3 style={{ margin: 0 }}>{esNuevo ? 'Nuevo curso' : 'Editar curso'}</h3>
      {!esNuevo && <p style={{ margin: 0 }}>Estado: {status === 'published' ? 'Publicado' : 'Borrador'}</p>}

      <label>
        Título
        <input
          style={{ display: 'block', width: '100%' }}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />
      </label>

      <label>
        Slug (parte de la dirección del curso)
        <input
          style={{ display: 'block', width: '100%' }}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugManual(true)
          }}
          required
        />
      </label>

      <label>
        Descripción
        <textarea
          style={{ display: 'block', width: '100%' }}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label>
        Precio (ARS, pesos enteros)
        <input
          type="number"
          min="0"
          step="1"
          style={{ display: 'block' }}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </label>

      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      {aviso && <p style={{ color: 'green', margin: 0 }}>{aviso}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}