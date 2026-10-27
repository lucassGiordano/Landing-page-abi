import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const estilo = ({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })

  return (
    <div>
      <h2>Panel de administración</h2>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <NavLink to="/admin/cursos" style={estilo}>
          Cursos
        </NavLink>
        <NavLink to="/admin/compras" style={estilo}>
          Compras
        </NavLink>
        <NavLink to="/admin/usuarios" style={estilo}>
          Usuarios
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}