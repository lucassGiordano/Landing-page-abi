import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { supabase } from './lib/supabase.js'

function PruebaConexion() {
  const [estado, setEstado] = useState('Probando conexión...')

  useEffect(() => {
        supabase
      .from('courses')
      .select('id')
      .then(({ data, error }) => {
        setEstado(
          error
            ? 'Error: ' + error.message
            : `Conexión OK. Cursos publicados visibles: ${data.length}`,
        )
      })
  }, [])

  return <p>{estado}</p>
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Sección de cursos</h1>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link to="/">Catálogo</Link>
        <Link to="/login">Ingresar</Link>
      </nav>
      <Routes>
        <Route path="/" element={<PruebaConexion />} />
        <Route path="/login" element={<p>Pantalla de login (próximamente)</p>} />
        <Route path="*" element={<p>Página no encontrada</p>} />
      </Routes>
    </div>
  )
}