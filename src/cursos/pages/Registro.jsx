import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Registro() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: nombre.trim() },
        emailRedirectTo: `${window.location.origin}/cursos/login`,
      },
    })
    setBusy(false)
    if (error) {
      setError('No se pudo crear la cuenta: ' + error.message)
      return
    }
    if (data.session) {
      navigate('/') // si la confirmación de email estuviera desactivada
    } else {
      setEnviado(true)
    }
  }

  if (enviado) {
    return (
      <div>
        <h2>Revisá tu email</h2>
        <p>
          Si el email es válido, te enviamos un enlace para confirmar tu cuenta. Después
          de confirmar, podés <Link to="/login">ingresar</Link>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <h2>Crear cuenta</h2>
      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña (mínimo 8 caracteres)"
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
        {busy ? 'Creando...' : 'Crear cuenta'}
      </button>
      <p style={{ margin: 0 }}>
        ¿Ya tenés cuenta? <Link to="/login">Ingresar</Link>
      </p>
    </form>
  )
}