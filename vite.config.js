import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Solo en desarrollo: cualquier ruta /cursos/... que no sea un archivo
// devuelve cursos/index.html (necesario para las rutas de React Router).
const cursosFallback = () => {
  const rewrite = (req, _res, next) => {
    const url = req.url.split('?')[0]
    if (url === '/cursos' || (url.startsWith('/cursos/') && !url.includes('.'))) {
      req.url = '/cursos/index.html'
    }
    next()
  }
  return {
    name: 'cursos-spa-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  plugins: [react(), cursosFallback()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cursos: fileURLToPath(new URL('./cursos/index.html', import.meta.url)),
      },
    },
  },
})