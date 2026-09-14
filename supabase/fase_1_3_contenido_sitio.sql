-- ============================================================
-- FASE 1.3 — Contenido editable del sitio (sin tocar código)
-- Guarda en una sola tabla, como pares clave/valor JSON, todo lo que
-- antes estaba escrito a mano en el código: la dirección y el mapa,
-- las fotos e info de "Nuestra Sede", el texto y fotos de
-- "Fabricación", y los métodos de pago. El panel admin en
-- /admin/contenido edita estas filas; las páginas públicas
-- (Contacto.jsx, Fabricacion.jsx) las leen al cargar, y si no
-- encuentran nada usan los mismos textos/fotos de siempre como
-- respaldo (ver src/lib/contenido.js).
-- Ejecuta este bloque una sola vez en el SQL Editor de Supabase.
-- ============================================================

create table if not exists contenido_sitio (
  clave text primary key,
  datos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);

create or replace function set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contenido_sitio_actualizado on contenido_sitio;
create trigger trg_contenido_sitio_actualizado
  before update on contenido_sitio
  for each row execute function set_actualizado_en();

alter table contenido_sitio enable row level security;

drop policy if exists "contenido_sitio: lectura publica" on contenido_sitio;
create policy "contenido_sitio: lectura publica"
  on contenido_sitio for select
  using (true);

-- Mismo esquema temporal de escritura pública que el resto de las
-- tablas del panel admin (ver la nota de seguridad en schema.sql).
drop policy if exists "contenido_sitio: escritura temporal anon" on contenido_sitio;
create policy "contenido_sitio: escritura temporal anon"
  on contenido_sitio for all
  using (true)
  with check (true);
