-- Ejecuta esto en Supabase: Panel -> SQL Editor -> New query -> Run

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
