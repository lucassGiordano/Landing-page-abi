import { supabase } from './supabase.js'

// Rutas de los archivos privados de un módulo
export async function archivosDeModulo(moduleId) {
  const { data } = await supabase
    .from('contents')
    .select('storage_path')
    .eq('module_id', moduleId)
    .not('storage_path', 'is', null)
  return (data ?? []).map((r) => r.storage_path)
}

// Rutas de los archivos privados de todos los módulos de un curso
export async function archivosDeCurso(courseId) {
  const { data } = await supabase
    .from('contents')
    .select('storage_path, modules!inner(course_id)')
    .eq('modules.course_id', courseId)
    .not('storage_path', 'is', null)
  return (data ?? []).map((r) => r.storage_path)
}

export async function borrarArchivos(bucket, paths) {
  if (!paths.length) return
  await supabase.storage.from(bucket).remove(paths)
}