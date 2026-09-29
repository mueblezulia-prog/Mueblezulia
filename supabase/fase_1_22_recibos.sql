-- ============================================================
-- Fase 1.22 — Recibos de pago (para imprimir o mandar en PDF)
-- ============================================================
-- Crea:
--   • negocio_datos : tus datos (nombre, RIF, dirección…) que salen en
--                      el encabezado de cada recibo. Es una sola fila.
--   • recibos       : cada recibo que generes, numerado en orden
--                      (guarda una "foto" de los datos de ese momento,
--                      así si cambias un precio después, el recibo viejo
--                      no cambia).
--
-- Privado: solo lo ve quien tenga el permiso "dinero" en el panel de
-- usuarios (igual que los pagos de los pedidos).
--
-- Cómo usarla: Supabase → SQL Editor → pega todo este archivo → Run.
-- Necesita haber corrido antes fase_1_20 y fase_1_21. Es seguro correrla
-- más de una vez.

create extension if not exists pgcrypto;

-- La cédula o RIF del cliente, para poner en sus recibos.
alter table public.clientes add column if not exists cedula_rif text;

-- ---------- TUS DATOS (para el encabezado del recibo) ----------
create table if not exists public.negocio_datos (
  id int primary key default 1 check (id = 1), -- una sola fila
  nombre text not null default 'Mueble Zulia',
  rif text,
  direccion text,
  telefonos text,
  instagram text,
  actualizado_en timestamptz not null default now()
);
insert into public.negocio_datos (id, nombre, rif, direccion, telefonos, instagram)
values (
  1, 'Muebles Zulia Premiun E&Z', 'J504035408',
  'Av 15 Las Delicias, Local Nro S/N, Sector Las Tarabas, Maracaibo, Zulia. Zona Postal 4001',
  '0412-1026798 / 0412-7519141', '@mueblezulia'
)
on conflict (id) do nothing;

-- ---------- RECIBOS ----------
create table if not exists public.recibos (
  id uuid primary key default gen_random_uuid(),
  numero bigserial,                    -- Nº correlativo del recibo (000001, 000002…)
  pedido_id uuid references public.pedidos(id) on delete set null,
  fecha date not null default current_date,

  -- Datos del cliente en ese recibo (aunque el cliente cambie después,
  -- el recibo impreso queda igual).
  cliente_nombre text not null,
  cliente_domicilio text,
  cliente_telefono text,
  cliente_ci_rif text,

  condicion_pago text not null default 'contado' check (condicion_pago in ('contado', 'credito')),
  dias_credito int,
  formas_pago text[] not null default '{}',  -- efectivo, punto_venta, cheque_transferencia, otros
  referencia text,
  banco text,

  items jsonb not null default '[]',   -- [{cantidad, descripcion, precio_unitario, total}]
  observaciones text,
  abono numeric not null default 0,
  resta numeric not null default 0,
  total numeric not null default 0,

  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index if not exists recibos_pedido_idx on public.recibos (pedido_id);
create index if not exists recibos_fecha_idx on public.recibos (fecha);

-- ---------- SEGURIDAD ----------
do $$
begin
  if to_regprocedure('public.mz_puede(text)') is null then
    raise exception 'Falta correr fase_1_21_permisos_usuarios.sql antes que esta.';
  end if;
end $$;

alter table public.negocio_datos enable row level security;
drop policy if exists "ver datos negocio" on public.negocio_datos;
drop policy if exists "editar datos negocio" on public.negocio_datos;
create policy "ver datos negocio" on public.negocio_datos for select to authenticated
  using (public.mz_puede('dinero') or public.mz_puede('usuarios'));
create policy "editar datos negocio" on public.negocio_datos for update to authenticated
  using (public.mz_es_dueno()) with check (public.mz_es_dueno());
revoke all on public.negocio_datos from anon;

alter table public.recibos enable row level security;
drop policy if exists "recibos" on public.recibos;
create policy "recibos" on public.recibos for all to authenticated
  using (public.mz_puede('dinero')) with check (public.mz_puede('dinero'));
revoke all on public.recibos from anon;
grant usage, select on sequence public.recibos_numero_seq to authenticated;
