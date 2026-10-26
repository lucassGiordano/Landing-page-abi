import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { slugify } from '../../lib/format.js'
import { borrarArchivos } from '../../lib/storageCleanup.js'
import VideoPlayer from '../../components/VideoPlayer.jsx'
import { extraerIdYoutube } from '../../lib/video.js'

const TIPOS = { text: 'Texto', pdf: 'PDF', doc: 'Documento', image: 'Imagen', video: 'Video' }

const MAX_BYTES = 50 * 1024 * 1024
const OFFICE = 'application/vnd.openxmlformats-officedocument'

// Tipo de contenido y tipo MIME según la extensión (coinciden con los permitidos por el bucket)
const POR_EXTENSION = {
  pdf: { tipo: 'pdf', mime: 'application/pdf' },
  png: { tipo: 'image', mime: 'image/png' },
  jpg: { tipo: 'image', mime: 'image/jpeg' },
  jpeg: { tipo: 'image', mime: 'image/jpeg' },
  webp: { tipo: 'image', mime: 'image/webp' },
  doc: { tipo: 'doc', mime: 'application/msword' },
  docx: { tipo: 'doc', mime: `${OFFICE}.wordprocessingml.document` },
  pptx: { tipo: 'doc', mime: `${OFFICE}.presentationml.presentation` },
  xlsx: { tipo: 'doc', mime: `${OFFICE}.spreadsheetml.sheet` },
  txt: { tipo: 'doc', mime: 'text/plain' },
}

function extensionDe(nombre) {
  const punto = nombre.lastIndexOf('.')
  return punto > 0 ? nombre.slice(punto + 1).toLowerCase() : ''
}

// "Guía Módulo 1 (final).PDF" -> "guia-modulo-1-final.pdf"
function nombreSeguro(nombre) {
  const ext = extensionDe(nombre)
  const base = ext ? nombre.slice(0, nombre.length - ext.length - 1) : nombre
  return `${slugify(base) || 'archivo'}.${ext}`
}

// "<curso>/<modulo>/1730000000000-guia.pdf" -> "guia.pdf"
function nombreVisible(path) {
  return path.split('/').pop().replace(/^\d+-/, '')
}

export default function ContenidosPage() {
  const { id, moduleId } = useParams()
  const [modulo, setModulo] = useState(null)
  const [contenidos, setContenidos] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // null | { kind: 'text', id: null | uuid, title, body } | { kind: 'file', title, file }
  const [form, setForm] = useState(null)
  const [borrarId, setBorrarId] = useState(null)
  const [enlace, setEnlace] = useState(null) // { id, url }
  const [videoVisibleId, setVideoVisibleId] = useState(null)

  async function cargar() {
    const [m, c] = await Promise.all([
      supabase.from('modules').select('id, title, course_id').eq('id', moduleId).single(),
      supabase
        .from('contents')
        .select('id, type, title, position, body_md, storage_path, video_provider, video_ref')
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

  function siguientePosicion() {
    return contenidos.length ? Math.max(...contenidos.map((c) => c.position)) + 1 : 1
  }

  async function guardarTexto(e) {
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
      res = await supabase.from('contents').insert({
        module_id: moduleId,
        position: siguientePosicion(),
        type: 'text',
        title,
        body_md: body,
      })
    }
    setBusy(false)
    if (res.error) return setError('No se pudo guardar: ' + res.error.message)
    setForm(null)
    cargar()
  }

  async function guardarArchivo(e) {
    e.preventDefault()
    const title = form.title.trim()
    const file = form.file
    if (!title) return setError('El título es obligatorio.')
    if (!file) return setError('Elegí un archivo.')

    const info = POR_EXTENSION[extensionDe(file.name)]
    if (!info)
      return setError('Formato no permitido. Usá PDF, DOC, DOCX, PPTX, XLSX, TXT, PNG, JPG o WEBP.')
    if (file.size > MAX_BYTES) return setError('El archivo supera los 50 MB.')

    setError('')
    setBusy(true)
    const path = `${modulo.course_id}/${moduleId}/${Date.now()}-${nombreSeguro(file.name)}`

    const { error: errSubida } = await supabase.storage
      .from('course-files')
      .upload(path, file, { contentType: info.mime, upsert: false })
    if (errSubida) {
      setBusy(false)
      return setError('No se pudo subir el archivo: ' + errSubida.message)
    }

    const { error: errDb } = await supabase.from('contents').insert({
      module_id: moduleId,
      position: siguientePosicion(),
      type: info.tipo,
      title,
      storage_path: path,
    })
    if (errDb) {
      await supabase.storage.from('course-files').remove([path]) // no dejar archivos huérfanos
      setBusy(false)
      return setError('No se pudo guardar el contenido: ' + errDb.message)
    }

    setBusy(false)
    setForm(null)
    cargar()
  }

    async function guardarVideo(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('El título es obligatorio.')
    const ref = extraerIdYoutube(form.url)
    if (!ref)
      return setError('No reconozco ese enlace de YouTube. Pegá la dirección completa del video.')
    setError('')
    setBusy(true)
    const { error } = await supabase.from('contents').insert({
      module_id: moduleId,
      position: siguientePosicion(),
      type: 'video',
      title,
      video_provider: 'youtube',
      video_ref: ref,
    })
    setBusy(false)
    if (error) return setError('No se pudo guardar el video: ' + error.message)
    setForm(null)
    cargar()
  }

  async function verArchivo(c) {
    setError('')
    setEnlace(null)
    const { data, error } = await supabase.storage
      .from('course-files')
      .createSignedUrl(c.storage_path, 60)
    if (error) return setError('No se pudo generar el enlace: ' + error.message)
    setEnlace({ id: c.id, url: data.signedUrl })
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
    if (c.storage_path) await borrarArchivos('course-files', [c.storage_path])

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
            <li key={c.id} style={{ margin: '10px 0' }}>
              <small style={{ marginRight: 8, padding: '1px 6px', border: '1px solid #ccc' }}>
                {TIPOS[c.type]}
              </small>
              <span style={{ marginRight: 8 }}>{c.title}</span>
              {c.storage_path && (
                <small style={{ marginRight: 12, color: '#666' }}>
                  ({nombreVisible(c.storage_path)})
                </small>
              )}
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
                        onClick={() =>
                          setForm({ kind: 'text', id: c.id, title: c.title, body: c.body_md ?? '' })
                        }
                        disabled={busy}
                      >
                        Editar
                      </button>{' '}
                    </>
                  )}

                  {c.type === 'video' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setVideoVisibleId(videoVisibleId === c.id ? null : c.id)}
                      >
                        {videoVisibleId === c.id ? 'Ocultar' : 'Ver'}
                      </button>{' '}
                    </>
                  )}
                  {c.storage_path && (
                    <>
                      <button type="button" onClick={() => verArchivo(c)} disabled={busy}>
                        Ver
                      </button>{' '}
                    </>
                  )}
                  <button type="button" onClick={() => setBorrarId(c.id)} disabled={busy}>
                    Eliminar
                  </button>
                </>
              )}
              {enlace?.id === c.id && (
                <div style={{ marginTop: 4 }}>
                  <a href={enlace.url} target="_blank" rel="noreferrer">
                    Abrir archivo
                  </a>{' '}
                  <small>(el enlace vence en 60 segundos)</small>
                </div>
              )}
              {videoVisibleId === c.id && (
                <div style={{ marginTop: 8, maxWidth: 480 }}>
                  <VideoPlayer provider={c.video_provider} videoRef={c.video_ref} title={c.title} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {contenidos && !form && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setForm({ kind: 'text', id: null, title: '', body: '' })}
          >
            + Agregar texto
          </button>
          <button type="button" onClick={() => setForm({ kind: 'file', title: '', file: null })}>
            + Agregar archivo
          </button>
          <button type="button" onClick={() => setForm({ kind: 'video', title: '', url: '' })}>
            + Agregar video
          </button>
        </div>
      )}

      {form?.kind === 'text' && (
        <form
          onSubmit={guardarTexto}
          style={{ display: 'grid', gap: 12, maxWidth: 560, marginTop: 16 }}
        >
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

      {form?.kind === 'file' && (
        <form
          onSubmit={guardarArchivo}
          style={{ display: 'grid', gap: 12, maxWidth: 560, marginTop: 16 }}
        >
          <h4 style={{ margin: 0 }}>Nuevo archivo</h4>
          <label>
            Título (lo que verá el alumno)
            <input
              style={{ display: 'block', width: '100%' }}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Archivo
            <input
              type="file"
              style={{ display: 'block' }}
              accept=".pdf,.doc,.docx,.pptx,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
            />
          </label>
          <small>
            Permitidos: PDF, DOC, DOCX, PPTX, XLSX, TXT, PNG, JPG, WEBP. Máximo 50 MB.
          </small>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy}>
              {busy ? 'Subiendo...' : 'Subir'}
            </button>
            <button
              type="button"
              disabled={busy}
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

      {form?.kind === 'video' && (
        <form
          onSubmit={guardarVideo}
          style={{ display: 'grid', gap: 12, maxWidth: 560, marginTop: 16 }}
        >
          <h4 style={{ margin: 0 }}>Nuevo video</h4>
          <label>
            Título (lo que verá el alumno)
            <input
              style={{ display: 'block', width: '100%' }}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Proveedor
            <select style={{ display: 'block' }} defaultValue="youtube">
              <option value="youtube">YouTube (no listado)</option>
              <option value="r2" disabled>
                Cloudflare R2 (próximamente)
              </option>
              <option value="bunny" disabled>
                Bunny Stream (próximamente)
              </option>
            </select>
          </label>
          <label>
            Enlace del video de YouTube
            <input
              style={{ display: 'block', width: '100%' }}
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>
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