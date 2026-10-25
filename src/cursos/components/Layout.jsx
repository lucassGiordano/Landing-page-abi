import { Link, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout() {
  const { user, profile, loading } = useAuth()

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Cursos</h1>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/">Catálogo</Link>
          {loading ? null : user ? (
            <>
              <Link to="/mis-cursos">Mis cursos</Link>
              {profile?.role === 'admin' && <Link to="/admin">Admin</Link>}
              <span>
                {profile?.display_name || user.email}
                {profile?.role === 'admin' ? ' (admin)' : ''}
              </span>
              <button onClick={() => supabase.auth.signOut()}>Salir</button>
            </>
          ) : (
            <>
              <Link to="/login">Ingresar</Link>
              <Link to="/registro">Crear cuenta</Link>
            </>
          )}
        </nav>
      </header>
      <main style={{ marginTop: 24 }}>
        <Outlet />
      </main>
    </div>
  )
}