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
  categoria text not null,           -- modulares | comedores | dormitorios | mesa-centro | reflejos | mueble-tv
  desc text,
  precio numeric not null,
  imagen text                        -- URL de la imagen del producto
);
