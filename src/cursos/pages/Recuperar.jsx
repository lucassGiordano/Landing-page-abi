import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/cursos/nueva-contrasena`,
    })
    setBusy(false)
    if (error) {
      setError('No se pudo enviar el email. Probá de nuevo en unos minutos.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div>
        <h2>Revisá tu email</h2>
        <p>
          Si ese email tiene una cuenta, te enviamos un enlace para elegir una nueva
          contraseña. Volver a <Link to="/login">ingresar</Link>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <h2>Recuperar contraseña</h2>
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Enviando...' : 'Enviar enlace'}
      </button>
      <p style={{ margin: 0 }}>
        <Link to="/login">Volver a ingresar</Link>
      </p>
    </form>
  )
}