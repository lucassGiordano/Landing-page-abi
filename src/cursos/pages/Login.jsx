import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const navigate = useNavigate()
    const location = useLocation()
  const { user } = useAuth()
  const destino = location.state?.from || '/'

  // Si hay sesión (recién ingresó o ya la tenía), va al destino
  useEffect(() => {
    if (user) navigate(destino, { replace: true })
  }, [user, destino, navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(
        error.message.includes('Email not confirmed')
          ? 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.'
          : 'Email o contraseña incorrectos.',
      )
      return
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <h2>Ingresar</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Ingresando...' : 'Ingresar'}
      </button>
      <p style={{ margin: 0 }}>
        ¿No tenés cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
            <p style={{ margin: 0 }}>
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
      </p>
    </form>
  )
}