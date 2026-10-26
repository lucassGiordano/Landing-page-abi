// Extrae el ID de un enlace de YouTube (watch, youtu.be, embed, shorts, live)
export function extraerIdYoutube(texto) {
  const valor = (texto ?? '').trim()
  if (/^[\w-]{11}$/.test(valor)) return valor

  let url
  try {
    url = new URL(valor)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\.|^m\./, '')
  let id = null
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0]
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else {
      const m = url.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/)
      if (m) id = m[2]
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null
}