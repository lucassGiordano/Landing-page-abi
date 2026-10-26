import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

const TIPOS = { text: 'Texto', pdf: 'PDF', doc: 'Documento', image: 'Imagen', video: 'Video' }

export default function ContenidosPage() {
  const { id, moduleId } = useParams()
  const [modulo, setModulo] = useState(null)
  const [contenidos, setContenidos] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(null) // null | { id: null | uuid, title, body }
  const [borrarId, setBorrarId] = useState(null)

  async function cargar() {
    const [m, c] = await Promise.all([
      supabase.from('modules').select('id, title, course_id').eq('id', moduleId).single(),
      supabase
        .from('contents')
        .select('id, type, title, position, body_md')
        .eq('module_id', moduleId)
        .order('position'),
    ])
    if (m.error || !m.data) return setError('No se encontró el módulo.')
    if (c.error) return setError(c.error.message)
    setModulo(m.data)
    setContenidos(c.data)
  }

  useEffect(() => {
    cargar()
  }, [moduleId])

  async function guardar(e) {
    e.preventDefault()
    const title = form.title.trim()
    const body = form.body.trim()
    if (!title) return setError('El título es obligatorio.')
    if (!body) return setError('El texto no puede estar vacío.')
    setError('')
    setBusy(true)

    let res
    if (form.id) {
      res = await supabase.from('contents').update({ title, body_md: body }).eq('id', form.id)
    } else {
      const siguiente = contenidos.length ? Math.max(...contenidos.map((c) => c.position)) + 1 : 1
      res = await supabase
        .from('contents')
        .insert({ module_id: moduleId, position: siguiente, type: 'text', title, body_md: body })
    }
    setBusy(false)
    if (res.error) return setError('No se pudo guardar: ' + res.error.message)
    setForm(null)
    cargar()
  }

  async function mover(index, delta) {
    const destino = index + delta
    if (destino < 0 || destino >= contenidos.length) return
    const ids = contenidos.map((c) => c.id)
    const tmp = ids[index]
    ids[index] = ids[destino]
    ids[destino] = tmp
    setError('')
    setBusy(true)
    const { error } = await supabase.rpc('reorder_contents', { p_module_id: moduleId, p_ids: ids })
    setBusy(false)
    if (error) return setError('No se pudo reordenar: ' + error.message)
    cargar()
  }

  async function eliminar(c) {
    setError('')
    setBusy(true)
    const { error } = await supabase.from('contents').delete().eq('id', c.id)
    if (error) {
      setBusy(false)
      return setError('No se pudo eliminar: ' + error.message)
    }
    // Reacomoda las posiciones restantes a 1..n
    const restantes = contenidos.filter((x) => x.id !== c.id).map((x) => x.id)
    if (restantes.length) {
      await supabase.rpc('reorder_contents', { p_module_id: moduleId, p_ids: restantes })
    }
    setBorrarId(null)
    setBusy(false)
    cargar()
  }

  return (
    <div>
      <p style={{ margin: 0 }}>
        <Link to={`/admin/cursos/${id}/modulos`}>← Volver a módulos</Link>
      </p>
      <h3>Contenidos{modulo ? ` del módulo "${modulo.title}"` : ''}</h3>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {contenidos === null && !error && <p>Cargando...</p>}
      {contenidos?.length === 0 && <p>Todavía no hay contenidos. Agregá el primero.</p>}

      {contenidos?.length > 0 && (
        <ol style={{ paddingLeft: 20 }}>
          {contenidos.map((c, i) => (
            <li key={c.id} style={{ margin: '8px 0' }}>
              <small style={{ marginRight: 8, padding: '1px 6px', border: '1px solid #ccc' }}>
                {TIPOS[c.type]}
              </small>
              <span style={{ marginRight: 12 }}>{c.title}</span>
              {borrarId === c.id ? (
                <>
                  <span>¿Eliminar este contenido? </span>
                  <button type="button" onClick={() => eliminar(c)} disabled={busy}>
                    Sí, eliminar
                  </button>{' '}
                  <button type="button" onClick={() => setBorrarId(null)}>
                    No
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => mover(i, -1)} disabled={busy || i === 0}>
                    ▲
                  </button>{' '}
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={busy || i === contenidos.length - 1}
                  >
                    ▼
                  </button>{' '}
                  {c.type === 'text' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ id: c.id, title: c.title, body: c.body_md ?? '' })}
                        disabled={busy}
                      >
                        Editar
                      </button>{' '}
                    </>
                  )}
                  <button type="button" onClick={() => setBorrarId(c.id)} disabled={busy}>
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {contenidos && !form && (
        <button type="button" onClick={() => setForm({ id: null, title: '', body: '' })}>
          + Agregar texto
        </button>
      )}

      {form && (
        <form onSubmit={guardar} style={{ display: 'grid', gap: 12, maxWidth: 560, marginTop: 16 }}>
          <h4 style={{ margin: 0 }}>{form.id ? 'Editar texto' : 'Nuevo texto'}</h4>
          <label>
            Título
            <input
              style={{ display: 'block', width: '100%' }}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Texto (formato Markdown)
            <textarea
              style={{ display: 'block', width: '100%' }}
              rows={12}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <small>Ejemplo: ## Subtítulo, **negrita**, listas con guiones (- elemento).</small>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy}>
              {busy ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null)
                setError('')
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}