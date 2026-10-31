import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout() {
  const { user, profile, loading } = useAuth()
  const nombre = profile?.display_name || user?.email

  return (
    <div className="cursos-app">
      <nav className="site-nav">
        <a href="/" className="brand" aria-label="Volver al sitio de Cuerpo Raíz">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <g stroke="#f2ece0" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d="M20 2 C20 12 15 15 15 24 C15 30 11 32 9 38" />
              <path d="M20 2 C20 12 15 15 15 24 C15 30 22 33 22 38" />
              <path d="M15 24 C22 26 24 24 29 27" />
            </g>
            <circle cx="20" cy="2" r="2.4" fill="#c98a68" />
          </svg>
          <span>Cuerpo Raíz</span>
        </a>

        <ul className="nav-links">
          <li>
            <NavLink to="/" end>
              Catálogo
            </NavLink>
          </li>
          {user && (
            <li>
              <NavLink to="/mis-cursos">Mis cursos</NavLink>
            </li>
          )}
          {profile?.role === 'admin' && (
            <li>
              <NavLink to="/admin">Admin</NavLink>
            </li>
          )}
        </ul>

        <div className="nav-session">
          {loading ? null : user ? (
            <>
              <span className="nav-user">{nombre}</span>
              <button type="button" onClick={() => supabase.auth.signOut()}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Ingresar</Link>
              <Link to="/registro" className="cta-link">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="cursos-main">
        <Outlet />
      </main>

      <footer>Abigail Vajda · Cuerpo Raíz</footer>
    </div>
  )
}