import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { coverUrl } from '../lib/format.js'

const TIPOS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const MAX_BYTES = 5 * 1024 * 1024

export default function CoverUploader({ courseId, path, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setError('')

    const ext = TIPOS[file.type]
    if (!ext) return setError('Formato no permitido. Usá PNG, JPG o WEBP.')
    if (file.size > MAX_BYTES) return setError('La imagen supera los 5 MB.')

    setBusy(true)
    const nuevoPath = `${courseId}/${Date.now()}.${ext}`

    const { error: errSubida } = await supabase.storage
      .from('covers')
      .upload(nuevoPath, file, { contentType: file.type, upsert: false })
    if (errSubida) {
      setBusy(false)
      return setError('No se pudo subir la imagen: ' + errSubida.message)
    }

    const { error: errDb } = await supabase
      .from('courses')
      .update({ cover_path: nuevoPath })
      .eq('id', courseId)
    if (errDb) {
      await supabase.storage.from('covers').remove([nuevoPath]) // no dejar archivos huérfanos
      setBusy(false)
      return setError('No se pudo guardar la portada: ' + errDb.message)
    }

    if (path) await supabase.storage.from('covers').remove([path]) // borra la portada anterior
    onChange(nuevoPath)
    setBusy(false)
  }

  async function quitar() {
    if (!path || !window.confirm('¿Quitar la portada?')) return
    setError('')
    setBusy(true)
    const { error: errDb } = await supabase
      .from('courses')
      .update({ cover_path: null })
      .eq('id', courseId)
    if (errDb) {
      setBusy(false)
      return setError('No se pudo quitar la portada: ' + errDb.message)
    }
    await supabase.storage.from('covers').remove([path])
    onChange(null)
    setBusy(false)
  }

  const url = coverUrl(path)

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>Portada</strong>
      {url ? (
        <img
          src={url}
          alt="Portada del curso"
          style={{ maxWidth: 320, borderRadius: 4, border: '1px solid #ddd' }}
        />
      ) : (
        <p style={{ margin: 0 }}>Sin portada.</p>
      )}
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} disabled={busy} />
      {path && (
        <button type="button" onClick={quitar} disabled={busy} style={{ width: 'fit-content' }}>
          Quitar portada
        </button>
      )}
      {busy && <p style={{ margin: 0 }}>Procesando...</p>}
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
    </div>
  )
}