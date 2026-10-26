import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// TEMPORAL: se borra en el Paso 5
function PruebaPermisos() {
  const [resultado, setResultado] = useState('')

  async function probar() {
    setResultado('Probando...')
    const { error } = await supabase
      .from('courses')
      .insert({ slug: 'zz-prueba-paso4', title: 'Prueba paso 4' })
    if (error) {
      setResultado('RECHAZADO por el servidor: ' + error.message)
      return
    }
    await supabase.from('courses').delete().eq('slug', 'zz-prueba-paso4')
    setResultado('PERMITIDO (curso de prueba creado y borrado). Solo debería pasar con admin.')
  }

  return (
    <div style={{ marginTop: 32, padding: 12, border: '1px dashed gray' }}>
      <p>Prueba temporal de seguridad del servidor</p>
      <button onClick={probar}>Intentar crear un curso</button>
      <p>{resultado}</p>
    </div>
  )
}

export default function MisCursos() {
  return (
    <div>
      <h2>Mis cursos</h2>
      <p>Todavía no tenés cursos comprados.</p>
    </div>
  )
}