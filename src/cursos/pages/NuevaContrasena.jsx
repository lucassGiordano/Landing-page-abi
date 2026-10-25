import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function NuevaContrasena() {
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError('No se pudo cambiar la contraseña: ' + error.message)
      return
    }
    setListo(true)
  }

  if (loading) return <p>Cargando...</p>

  if (!session) {
    return (
      <div>
        <h2>Enlace inválido o vencido</h2>
        <p>
          Pedí uno nuevo desde <Link to="/recuperar">recuperar contraseña</Link>.
        </p>
      </div>
    )
  }

  if (listo) {
    return (
      <div>
        <h2>Contraseña actualizada</h2>
        <p>
          Ya podés seguir. Ir al <Link to="/">catálogo</Link>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <h2>Elegí tu nueva contraseña</h2>
      <input
        type="password"
        placeholder="Nueva contraseña (mínimo 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Repetir contraseña"
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        required
      />
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  )
}