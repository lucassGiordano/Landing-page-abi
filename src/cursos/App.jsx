import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Recuperar from './pages/Recuperar.jsx'
import NuevaContrasena from './pages/NuevaContrasena.jsx'

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
          <Route path="*" element={<p>Página no encontrada</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}