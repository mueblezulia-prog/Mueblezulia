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
  total numeric
);

create table if not exists productos (
  id bigint generated always as identity primary key,
  creado_en timestamp with time zone default now(),
  nombre text not null,
  categoria text not null,           -- coincide con el "slug" de la tabla categorias
  descripcion text,
  precio numeric not null,
  imagen text                        -- URL de la imagen del producto
);

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
