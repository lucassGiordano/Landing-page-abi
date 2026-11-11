// GitHub Pages no tiene reglas de reescritura como Netlify o Vercel: cuando la
// ruta no existe, devuelve el archivo `404.html`. Para que las rutas internas de
// la app de cursos (/cursos/mis-cursos, /cursos/gracias, /curso/:slug/aprender)
// funcionen al recargar o al abrir un enlace directo, publicamos una copia del
// HTML de la app como 404.
//
// El HTML usa rutas absolutas (/assets/...), así que cargándose desde
// /cursos/cualquier-cosa arranca bien y React Router resuelve el resto.

import { copyFileSync, existsSync } from 'node:fs'

const origen = 'dist/cursos/index.html'
const destino = 'dist/404.html'

if (!existsSync(origen)) {
  console.error(`No se encontró ${origen}. ¿Se ejecutó "vite build"?`)
  process.exit(1)
}

copyFileSync(origen, destino)
console.log('404.html generado (rutas profundas de la app de cursos)')
