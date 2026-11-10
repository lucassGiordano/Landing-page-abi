-- Progreso del alumno: permisos y políticas que faltaban.
--
-- Síntoma: al marcar una lección como completada, el navegador recibe
--   "permission denied for table progress"
-- porque el rol `authenticated` no tenía GRANT sobre la tabla (la RLS no
-- llega a evaluarse si falta el permiso de tabla).
--
-- Ejecutar UNA vez en el SQL Editor del proyecto.
-- Es idempotente: se puede volver a correr sin romper nada.

grant select, insert, update, delete on public.progress to authenticated;

alter table public.progress enable row level security;

-- Cada usuario ve y toca solo su propio avance.
drop policy if exists "progress_propio_select" on public.progress;
create policy "progress_propio_select"
  on public.progress for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "progress_propio_insert" on public.progress;
create policy "progress_propio_insert"
  on public.progress for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "progress_propio_update" on public.progress;
create policy "progress_propio_update"
  on public.progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "progress_propio_delete" on public.progress;
create policy "progress_propio_delete"
  on public.progress for delete
  to authenticated
  using (user_id = auth.uid());
