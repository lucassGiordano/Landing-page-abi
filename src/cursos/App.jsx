import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Recuperar from './pages/Recuperar.jsx'
import NuevaContrasena from './pages/NuevaContrasena.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import MisCursos from './pages/MisCursos.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import CursosList from './pages/admin/CursosList.jsx'
import CursoForm from './pages/admin/CursoForm.jsx'
import ModulosPage from './pages/admin/ModulosPage.jsx'
import ContenidosPage from './pages/admin/ContenidosPage.jsx'

function Catalogo() {
  return <p>Catálogo (próximamente)</p>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Catalogo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/nueva-contrasena" element={<NuevaContrasena />} />
          <Route element={<RequireAuth />}>
          <Route path="/mis-cursos" element={<MisCursos />} />
          </Route>
          <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="cursos" replace />} />
          <Route path="cursos" element={<CursosList />} />
          <Route path="cursos/nuevo" element={<CursoForm key="nuevo" />} />
          <Route path="cursos/:id" element={<CursoForm key="editar" />} />
          <Route path="cursos/:id/modulos" element={<ModulosPage />} />
          <Route path="cursos/:id/modulos/:moduleId" element={<ContenidosPage />} />
          </Route>
          </Route>
          <Route path="*" element={<p>Página no encontrada</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}