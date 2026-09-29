-- Fase 1.10 — Sistema de telas: familia (tela madre) + colores.
--
-- No se toca ningún dato existente: la tabla "telas" sigue siendo la
-- misma (cada fila es un color, con su nombre/hex/foto), solo se le
-- agrega un dato nuevo opcional: a qué familia pertenece. Todos los
-- colores que ya existen quedan "sin familia" (familia_id = null) hasta
-- que se les asigne una desde /admin/telas — no rompe nada de lo que ya
-- funciona (producto_colores sigue apuntando a "telas" igual que antes).
--
-- Idempotente: se puede correr más de una vez sin error.

create extension if not exists pgcrypto;

create table if not exists telas_familias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

alter table telas_familias enable row level security;

-- Mismo patrón de RLS "temporal" documentado en schema.sql para el resto
-- del proyecto: lectura pública + escritura abierta mientras no exista
-- autenticación de admin.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'telas_familias' and policyname = 'lectura publica telas_familias'
  ) then
    create policy "lectura publica telas_familias"
      on telas_familias for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'telas_familias' and policyname = 'escritura temporal anon telas_familias'
  ) then
    create policy "escritura temporal anon telas_familias"
      on telas_familias for all
      using (true)
      with check (true);
  end if;
end $$;

-- Cada color (fila de "telas") ahora puede pertenecer a una familia.
alter table telas
  add column if not exists familia_id uuid references telas_familias(id) on delete set null;

-- Foto real del color (si no se sube, se sigue mostrando el color plano
-- en hex, como hasta ahora). Si esta columna ya existía en tu base de
-- datos, esta línea no hace nada — es segura de correr igual.
alter table telas
  add column if not exists imagen text;

-- "Tela real" del mueble: qué color específico (de qué familia) trae
-- puesto ESE mueble en la foto. Es opcional (puede quedar sin asignar) y
-- convive con "producto_colores" (la lista de colores opcionales que ya
-- existía) — son dos cosas distintas, no se reemplazan entre sí.
alter table productos
  add column if not exists tela_color_id uuid references telas(id) on delete set null;
