-- Registro versionado de un cambio que ya está aplicado en producción
-- (se hizo a mano en el SQL Editor durante el Paso 7.1.1).
--
-- NO hace falta correrlo: la columna y el índice ya existen. Queda acá para
-- que, si algún día se recrea la base desde cero, el esquema no quede
-- incompleto. Es idempotente.

alter table public.orders
  add column if not exists mp_order_id text;

create unique index if not exists orders_mp_order_id_key
  on public.orders (mp_order_id)
  where mp_order_id is not null;
