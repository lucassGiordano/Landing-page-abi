import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export default function ModulosPage() {
  const { id } = useParams()
  const [curso, setCurso] = useState(null)
  const [modulos, setModulos] = useState(null)
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [tituloEdit, setTituloEdit] = useState('')

  async function cargar() {
    const [c, m] = await Promise.all([
      supabase.from('courses').select('id, title').eq('id', id).single(),
      supabase.from('modules').select('id, title, position').eq('course_id', id).order('position'),
    ])
    if (c.error || !c.data) return setError('No se encontró el curso.')
    if (m.error) return setError(m.error.message)
    setCurso(c.data)
    setModulos(m.data)
  }

  useEffect(() => {
    cargar()
  }, [id])

  async function agregar(e) {
    e.preventDefault()
    const titulo = nuevo.trim()
    if (!titulo) return
    setError('')
    setBusy(true)
    const siguiente = modulos.length ? Math.max(...modulos.map((m) => m.position)) + 1 : 1
    const { error } = await supabase
      .from('modules')
      .insert({ course_id: id, position: siguiente, title: titulo })
    setBusy(false)
    if (error) return setError('No se pudo crear el módulo: ' + error.message)
    setNuevo('')
    cargar()
  }

    function empezarEdicion(m) {
    setEditandoId(m.id)
    setTituloEdit(m.title)
  }

  async function guardarEdicion(m) {
    const titulo = tituloEdit.trim()
    if (!titulo || titulo === m.title) {
      setEditandoId(null)
      return
    }
    setError('')
    const { error } = await supabase.from('modules').update({ title: titulo }).eq('id', m.id)
    if (error) return setError('No se pudo renombrar: ' + error.message)
    setEditandoId(null)
    cargar()
  }

  async function mover(index, delta) {
    const destino = index + delta
    if (destino < 0 || destino >= modulos.length) return
    const ids = modulos.map((m) => m.id)
    const tmp = ids[index]
    ids[index] = ids[destino]
    ids[destino] = tmp
    setError('')
    setBusy(true)
    const { error } = await supabase.rpc('reorder_modules', { p_course_id: id, p_ids: ids })
    setBusy(false)
    if (error) return setError('No se pudo reordenar: ' + error.message)
    cargar()
  }

  async function eliminar(m) {
    if (!window.confirm(`¿Eliminar el módulo "${m.title}" y todo su contenido?`)) return
    setError('')
    setBusy(true)
    const { error } = await supabase.from('modules').delete().eq('id', m.id)
    if (error) {
      setBusy(false)
      return setError('No se pudo eliminar: ' + error.message)
    }
    // Reacomoda las posiciones restantes a 1..n
    const restantes = modulos.filter((x) => x.id !== m.id).map((x) => x.id)
    if (restantes.length) {
      await supabase.rpc('reorder_modules', { p_course_id: id, p_ids: restantes })
    }
    setBusy(false)
    cargar()
  }

  return (
    <div>
      <p style={{ margin: 0 }}>
        <Link to={`/admin/cursos/${id}`}>← Volver al curso</Link>
      </p>
      <h3>Módulos{curso ? ` de "${curso.title}"` : ''}</h3>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {modulos === null && !error && <p>Cargando...</p>}
      {modulos?.length === 0 && <p>Todavía no hay módulos. Agregá el primero.</p>}

      {modulos?.length > 0 && (
        <ol style={{ paddingLeft: 20 }}>
          {modulos.map((m, i) => (
                        <li key={m.id} style={{ margin: '8px 0' }}>
              {editandoId === m.id ? (
                <>
                  <input
                    value={tituloEdit}
                    onChange={(e) => setTituloEdit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') guardarEdicion(m)
                      if (e.key === 'Escape') setEditandoId(null)
                    }}
                    autoFocus
                    style={{ marginRight: 8 }}
                  />
                  <button type="button" onClick={() => guardarEdicion(m)}>
                    Guardar
                  </button>{' '}
                  <button type="button" onClick={() => setEditandoId(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span style={{ marginRight: 12 }}>{m.title}</span>
                  <button type="button" onClick={() => mover(i, -1)} disabled={busy || i === 0}>
                    ▲
                  </button>{' '}
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={busy || i === modulos.length - 1}
                  >
                    ▼
                  </button>{' '}
                  <button type="button" onClick={() => empezarEdicion(m)} disabled={busy}>
                    Renombrar
                  </button>{' '}
                  <button type="button" onClick={() => eliminar(m)} disabled={busy}>
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {modulos && (
        <form onSubmit={agregar} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            placeholder="Título del nuevo módulo"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={busy}>
            Agregar módulo
          </button>
        </form>
      )}
    </div>
  )
}