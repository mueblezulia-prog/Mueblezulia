-- ============================================================
-- Mueble Zulia — Fase 1: Catálogo, Detalle y Panel Admin
-- Esquema Supabase (Postgres) — VERSIÓN CORREGIDA
-- ============================================================
-- Por qué este archivo es distinto al original:
-- Tu proyecto ya tenía una tabla "productos" de la versión anterior
-- del sitio (columnas: id bigint, nombre, categoria, descripcion,
-- precio, imagen, stock, disponible, destacado). La tabla nueva de
-- esta Fase 1 usa una estructura totalmente distinta (id uuid,
-- titulo, categoria_id, activo, imagen_original_url, etc).
-- Como "CREATE TABLE IF NOT EXISTS" no modifica una tabla que ya
-- existe, el CREATE INDEX sobre "activo" fallaba porque esa columna
-- nunca llegó a crearse. Este archivo primero RENOMBRA la tabla
-- vieja (para no perder nada) y crea la nueva limpia.
-- ============================================================

-- 1) Guarda la tabla de productos vieja como respaldo, por si acaso
--    (no se borra nada — solo se renombra). Si ya la habías respaldado
--    antes, esta línea no hace nada.
alter table if exists productos rename to productos_legacy_v1;

-- 2) Categorías: se reutiliza la tabla existente, solo se agrega la
--    columna "imagen" si todavía no la tiene.
create table if not exists categorias (
  id serial primary key,
  nombre text not null,
  slug text not null unique,
  orden int default 0,
  imagen text
);
alter table categorias add column if not exists imagen text;

-- ------------------------------------------------------------
-- PRODUCTOS (esquema nuevo de la Fase 1)
-- ------------------------------------------------------------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id int references categorias(id) on delete set null,

  titulo text not null,
  descripcion_corta text,
  descripcion_larga text,
  precio numeric(10,2) not null check (precio >= 0),

  imagen_original_url text,
  imagen_recortada_url text,
  crop_data jsonb,

  orden int default 0,
  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_productos_activo_orden on productos (activo, orden);
create index if not exists idx_productos_categoria on productos (categoria_id);

-- ------------------------------------------------------------
-- VARIANTES DE COLOR
-- ------------------------------------------------------------
create table if not exists producto_colores (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre text not null,
  hex text not null check (hex ~* '^#[0-9a-f]{6}$'),
  orden int default 0
);

create index if not exists idx_producto_colores_producto on producto_colores (producto_id);

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_productos_updated_at on productos;
create trigger trg_productos_updated_at
  before update on productos
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- STORAGE — bucket "productos" (imágenes originales y recortadas)
-- Nota: esto es un bucket NUEVO y distinto del bucket
-- "productos-imagenes" que ya tenías de la versión anterior.
-- Puedes dejar el viejo tal cual, no estorba.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "productos bucket: lectura publica" on storage.objects;
create policy "productos bucket: lectura publica"
on storage.objects for select
using (bucket_id = 'productos');

drop policy if exists "productos bucket: subida publica" on storage.objects;
create policy "productos bucket: subida publica"
on storage.objects for insert
with check (bucket_id = 'productos');

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table productos enable row level security;
alter table producto_colores enable row level security;

-- Lectura pública (catálogo y detalle son públicos)
drop policy if exists "productos: lectura publica" on productos;
create policy "productos: lectura publica"
  on productos for select
  using (true);

drop policy if exists "producto_colores: lectura publica" on producto_colores;
create policy "producto_colores: lectura publica"
  on producto_colores for select
  using (true);

-- ------------------------------------------------------------
-- IMPORTANTE — LEE ESTO ANTES DE USAR EL PANEL ADMIN EN PRODUCCIÓN:
-- Estas dos policies de abajo permiten escribir con la clave pública
-- (anon key), que es la que usa el formulario de React ahora mismo.
-- Esto significa que CUALQUIERA que abra las herramientas de
-- desarrollador del navegador y conozca tu URL de Supabase podría
-- escribir en estas tablas directamente, sin pasar por ninguna
-- contraseña. Es temporal para poder probar la Fase 1.
-- El propio README de este proyecto recomienda la solución correcta:
-- mover estas escrituras a través de server.js (que ya tiene
-- protección por contraseña) en vez de escribir desde el navegador.
-- Avísame cuando quieras que hagamos ese cambio.
-- ------------------------------------------------------------
drop policy if exists "productos: escritura temporal anon" on productos;
create policy "productos: escritura temporal anon"
  on productos for all
  using (true)
  with check (true);

drop policy if exists "producto_colores: escritura temporal anon" on producto_colores;
create policy "producto_colores: escritura temporal anon"
  on producto_colores for all
  using (true)
  with check (true);

-- ============================================================
-- FASE 1.1 — Galería de varias fotos + campo "medida"
-- Agregado para: (1) permitir varias fotos por mueble que el cliente
-- pueda deslizar en el detalle, y (2) mostrar la medida del mueble
-- (ej. "180cm x 90cm") con su propio ícono en el detalle.
-- Ejecuta este bloque en el SQL Editor de Supabase (es seguro correrlo
-- de nuevo si ya lo corriste antes — usa IF NOT EXISTS).
-- PENDIENTE (próxima sesión): el Panel Admin (ProductForm.jsx) todavía
-- solo sube UNA foto por mueble (imagen_recortada_url). Falta agregarle
-- un módulo para subir varias fotos y guardarlas en producto_imagenes,
-- y un campo de texto para "medida". El detalle del cliente (
-- ProductoDetalle.jsx) ya está listo para mostrarlas en cuanto existan.
-- ============================================================

alter table productos add column if not exists medida text;

create table if not exists producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  url text not null,
  orden int default 0
);

create index if not exists idx_producto_imagenes_producto on producto_imagenes (producto_id);

alter table producto_imagenes enable row level security;

drop policy if exists "producto_imagenes: lectura publica" on producto_imagenes;
create policy "producto_imagenes: lectura publica"
  on producto_imagenes for select
  using (true);

-- Mismo esquema temporal de escritura pública que las demás tablas de
-- Fase 1 (ver la nota de seguridad más arriba en este archivo).
drop policy if exists "producto_imagenes: escritura temporal anon" on producto_imagenes;
create policy "producto_imagenes: escritura temporal anon"
  on producto_imagenes for all
  using (true)
  with check (true);
