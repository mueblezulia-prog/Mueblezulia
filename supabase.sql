-- Ejecuta esto en Supabase: Panel -> SQL Editor -> New query -> Run
-- Si ya corriste una version anterior de este archivo (solo con "pedidos"),
-- solo necesitas correr la parte de "productos" que sigue abajo.

create table if not exists pedidos (
  id bigint generated always as identity primary key,
  creado_en timestamp with time zone default now(),
  nombre text,
  telefono text,
  correo text,
  direccion text,
  ubicacion jsonb,
  metodo_pago text,
  items jsonb,
  total numeric,
  estado text default 'pendiente'   -- pendiente | confirmado | entregado
);

-- Si la tabla "pedidos" ya existía de antes (sin la columna estado), esto la agrega:
alter table pedidos add column if not exists estado text default 'pendiente';

create table if not exists productos (
  id bigint generated always as identity primary key,
  creado_en timestamp with time zone default now(),
  nombre text not null,
  categoria text not null,           -- coincide con el "slug" de la tabla categorias
  descripcion text,
  precio numeric not null,
  imagen text,                       -- URL de la imagen del producto
  destacado boolean default false,   -- si aparece en "Productos Destacados" del home
  disponible boolean default true    -- si está en stock (false = se muestra "Agotado")
);

create table if not exists configuracion (
  id int primary key default 1,
  telefono text,
  direccion text,
  google_maps_url text,
  instagram_url text,
  tiktok_url text,
  whatsapp_url text,
  constraint solo_una_fila check (id = 1)
);

insert into configuracion (id, telefono, direccion, google_maps_url, instagram_url, tiktok_url, whatsapp_url)
values (1, '+58 412-7519141', 'Av. 15 Delicias, frente al Alicorp — Maracaibo, Zulia',
        'https://maps.app.goo.gl/c7ACGX1BsV4BrxxLA',
        'https://www.instagram.com/muebleszuliapremium',
        'https://www.tiktok.com/@muebleszulia',
        'https://wa.me/584127519141')
on conflict (id) do nothing;

-- Si la tabla "productos" ya existía de antes (sin estas columnas), esto las agrega:
alter table productos add column if not exists destacado boolean default false;
alter table productos add column if not exists disponible boolean default true;

create table if not exists categorias (
  id bigint generated always as identity primary key,
  creado_en timestamp with time zone default now(),
  nombre text not null,              -- ej: "Modulares"
  slug text not null unique,         -- ej: "modulares" (se usa para relacionar productos)
  imagen text,                       -- URL de la foto de portada de la categoría
  orden integer default 0            -- para controlar el orden en el catálogo
);

-- Categorías iniciales (puedes editarlas o borrarlas desde el panel admin)
insert into categorias (nombre, slug, orden)
values
  ('Modulares', 'modulares', 1),
  ('Comedores', 'comedores', 2),
  ('Dormitorios', 'dormitorios', 3),
  ('Mesa de Centro', 'mesa-centro', 4),
  ('Colección de Reflejos', 'reflejos', 5),
  ('Mueble TV', 'mueble-tv', 6)
on conflict (slug) do nothing;

-- ============================================================
-- BUCKET DE IMÁGENES (para que el panel admin pueda subir fotos)
-- Si el INSERT de abajo da error, créalo manualmente:
-- Panel de Supabase -> Storage -> New bucket -> nombre: productos-imagenes -> Public bucket: ACTIVADO
-- ============================================================
insert into storage.buckets (id, name, public)
values ('productos-imagenes', 'productos-imagenes', true)
on conflict (id) do nothing;

-- Permite que cualquiera vea las imágenes (necesario para que se muestren en el sitio)
drop policy if exists "Lectura pública de imágenes de productos" on storage.objects;
create policy "Lectura pública de imágenes de productos"
on storage.objects for select
using (bucket_id = 'productos-imagenes');

-- Permite subir imágenes (el panel admin ya está protegido por contraseña a nivel de servidor)
drop policy if exists "Subida de imágenes de productos" on storage.objects;
create policy "Subida de imágenes de productos"
on storage.objects for insert
with check (bucket_id = 'productos-imagenes');
