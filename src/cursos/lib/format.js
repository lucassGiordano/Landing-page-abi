import { supabase } from './supabase.js'

// Los precios se guardan en centavos de ARS; se muestran en pesos
export function formatARS(cents) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100)
}

// "Mi Curso Ñandú!" -> "mi-curso-nandu"
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function coverUrl(path) {
  if (!path) return null
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}