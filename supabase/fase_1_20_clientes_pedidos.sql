-- ============================================================
-- Fase 1.20 — Sistema interno: Clientes y Pedidos
-- ============================================================
-- Crea 4 tablas nuevas para las pestañas "Pedidos" y "Clientes" del panel:
--   • clientes      : nombre, teléfono, ciudad, dirección, notas…
--   • pedidos       : cada venta (estado, fecha de entrega, notas)
--   • pedido_items  : los muebles de cada pedido (tela/color, cantidad, precio)
--   • pedido_pagos  : abonos/pagos recibidos (inicial, resto, método)
--
-- IMPORTANTE: estas tablas son PRIVADAS desde el primer momento. Solo se
-- pueden ver o cambiar con la sesión iniciada en el panel. Los visitantes
-- de la página NO pueden leer nada de aquí.
--
-- Cómo usarla: Supabase → SQL Editor → pega todo este archivo → Run.
-- Es seguro correrlo más de una vez. No depende del orden de fase_1_17.

create extension if not exists pgcrypto;

-- ---------- CLIENTES ----------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  ciudad text,
  direccion text,
  origen text,          -- cómo nos conoció: Instagram, WhatsApp, Referido, Tienda…
  notas text,
  creado_en timestamptz not null default now()
);

-- ---------- PEDIDOS ----------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigserial,     -- número corto para hablar del pedido (#12, #13…)
  cliente_id uuid references public.clientes(id) on delete set null,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'confirmado', 'fabricacion', 'listo', 'entregado', 'cancelado')),
  fecha_entrega date,
  descuento numeric not null default 0,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists pedidos_cliente_idx on public.pedidos (cliente_id);
create index if not exists pedidos_estado_idx on public.pedidos (estado);

create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id text,     -- mueble del catálogo (si se eligió de ahí)
  descripcion text not null,
  tela_color text,
  cantidad int not null default 1 check (cantidad > 0),
  precio_unitario numeric not null default 0,
  orden int not null default 0
);
create index if not exists pedido_items_pedido_idx on public.pedido_items (pedido_id);

create table if not exists public.pedido_pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  monto numeric not null check (monto > 0),
  metodo text,          -- Zelle, Pago móvil, Efectivo, Transferencia, Binance…
  fecha date not null default current_date,
  nota text
);
create index if not exists pedido_pagos_pedido_idx on public.pedido_pagos (pedido_id);

-- Fecha de "última modificación" automática
create or replace function public._mz_tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists pedidos_actualizado on public.pedidos;
create trigger pedidos_actualizado before update on public.pedidos
  for each row execute function public._mz_tocar_actualizado();

-- ---------- SEGURIDAD: solo el panel (sesión iniciada) ----------
do $$
declare
  t text;
  pol record;
begin
  -- Si ya corriste fase_1_21 (permisos por usuario), NO se tocan las reglas
  -- de permisos: esas las maneja la 1_21.
  if to_regprocedure('public.mz_puede(text)') is not null then
    foreach t in array array['clientes', 'pedidos', 'pedido_items', 'pedido_pagos'] loop
      execute format('alter table public.%I enable row level security', t);
    end loop;
    raise notice 'Ya tienes permisos por usuario (fase_1_21). Si estas tablas son nuevas, vuelve a correr fase_1_21.';
    return;
  end if;
  foreach t in array array['clientes', 'pedidos', 'pedido_items', 'pedido_pagos'] loop
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format(
      'create policy "solo panel" on public.%I for all to authenticated using (true) with check (true)', t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant usage, select on sequence public.pedidos_numero_seq to authenticated;
