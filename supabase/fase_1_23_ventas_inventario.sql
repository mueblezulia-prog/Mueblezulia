-- ============================================================
-- Fase 1.23 — Ecosistema: ventas (contado, apartado y crédito),
--             abonos en $ y Bs, cobranza, caja diaria,
--             inventario de la tienda y tablero de números
-- ============================================================
-- Qué agrega (sin borrar nada de lo que ya tienes):
--
--   • VENTAS (la "factura"): se usa la misma tabla "pedidos" de la app.
--       - Contado: se paga completo.
--       - Apartado: abono mínimo 35% y 2 meses para pagar el resto.
--       - Crédito: sin mínimo, 2 meses para pagar; el mueble se entrega
--         cuando termina de pagar.
--     La factura es MIXTA: cada renglón puede ser un mueble del
--     inventario, uno del catálogo o uno a medida escrito a mano.
--   • ABONOS: un mismo abono puede venir en varias partes (ej. $100 en
--     Zelle + el resto en Bs por pago móvil). Los pagos en Bs guardan la
--     tasa usada (euro o dólar BCV) y su equivalente en $. La referencia
--     es opcional. Un abono no se borra: se ANULA con motivo (solo dueño).
--     Cada abono genera su RECIBO numerado automáticamente.
--   • TASA DEL DÍA: se anota una vez al día (euro y dólar BCV).
--   • NO ENTREGAR CON DEUDA: solo el dueño puede marcar "Entregado" si
--     falta plata; queda anotado como "Entregado – con deuda".
--   • COBRANZA: semáforo por fecha límite y registro de los avisos por
--     WhatsApp que se le mandaron a cada cliente.
--   • CAJA DIARIA: cierre de cada día (lo contado vs lo que dice el
--     sistema) y la opción "hoy no se vendió nada".
--   • INVENTARIO: artículos de la tienda, su costo (privado), entradas,
--     ajustes de conteo y salidas automáticas al entregar.
--   • TABLERO: ventas del mes, cobrado, por cobrar, días con venta,
--     comparación con el mes anterior y los últimos 12 meses.
--   • PERMISO NUEVO "finanzas": tablero, costos, anular abonos y
--     entregar con deuda. El dueño lo tiene siempre. El vendedor NO.
--
-- Cómo usarla: Supabase → SQL Editor → pega todo este archivo → Run.
-- Necesita haber corrido antes fase_1_20, fase_1_21 y fase_1_22.
-- Es seguro correrla más de una vez (también si ya corriste una
-- versión anterior de este mismo archivo).

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.mz_puede(text)') is null then
    raise exception 'Falta correr fase_1_21_permisos_usuarios.sql antes que esta.';
  end if;
  if to_regclass('public.recibos') is null or to_regclass('public.negocio_datos') is null then
    raise exception 'Falta correr fase_1_22_recibos.sql antes que esta.';
  end if;
end $$;

-- ============================================================
-- 1) Permiso nuevo: "finanzas"
-- ============================================================
create or replace function public._mz_validar_permisos(p_permisos text[])
returns text[]
language plpgsql
immutable
as $$
declare
  validos text[] := array['pedidos', 'dinero', 'clientes', 'inventario', 'finanzas', 'catalogo', 'contenido', 'estadisticas', 'usuarios'];
  x text;
begin
  foreach x in array coalesce(p_permisos, '{}') loop
    if not (x = any (validos)) then
      raise exception 'Permiso desconocido: %', x;
    end if;
  end loop;
  return coalesce((select array_agg(distinct y) from unnest(p_permisos) y), '{}');
end;
$$;

-- ============================================================
-- 2) Reglas del negocio (las cambia el dueño en "Mi negocio")
-- ============================================================
alter table public.negocio_datos
  add column if not exists abono_minimo_pct numeric not null default 35
    check (abono_minimo_pct between 0 and 100),
  add column if not exists plazo_apartado_meses int not null default 2
    check (plazo_apartado_meses between 1 and 24),
  add column if not exists dias_aviso_cobranza int not null default 7
    check (dias_aviso_cobranza between 0 and 60),
  add column if not exists tasa_preferida text not null default 'eur';

alter table public.negocio_datos drop constraint if exists negocio_datos_tasa_preferida_check;
alter table public.negocio_datos add constraint negocio_datos_tasa_preferida_check
  check (tasa_preferida in ('eur', 'usd'));

-- ============================================================
-- 3) Tasa del día (euro y dólar BCV, en Bs)
-- ============================================================
create table if not exists public.tasas_cambio (
  fecha date primary key default current_date,
  eur numeric check (eur > 0),       -- Bs por 1 euro (BCV)
  usd numeric check (usd > 0),       -- Bs por 1 dólar (BCV)
  registrado_por uuid default auth.uid() references auth.users(id) on delete set null,
  actualizado_en timestamptz not null default now()
);

-- ============================================================
-- 4) Clientes: cédula/RIF "limpia" para buscar y no repetir
--    "V-12.345.678", "v12345678" y "V 12345678" quedan iguales.
-- ============================================================
alter table public.clientes
  add column if not exists documento_norm text
    generated always as (nullif(upper(regexp_replace(coalesce(cedula_rif, ''), '[^0-9A-Za-z]', '', 'g')), '')) stored;

do $$
begin
  if exists (
    select 1 from public.clientes where documento_norm is not null
    group by documento_norm having count(*) > 1
  ) then
    create index if not exists clientes_documento_idx on public.clientes (documento_norm);
    raise notice 'Hay clientes repetidos con la misma cédula/RIF. Únelos y vuelve a correr este archivo para que no se puedan repetir.';
  else
    drop index if exists public.clientes_documento_idx;
    create unique index if not exists clientes_documento_unico on public.clientes (documento_norm)
      where documento_norm is not null;
  end if;
end $$;

-- Busca un cliente por cédula/RIF (solo los números cuentan, así
-- "12345678" encuentra a "V-12.345.678").
create or replace function public.mz_buscar_cliente_documento(p_documento text)
returns setof public.clientes
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.clientes
  where regexp_replace(coalesce(cedula_rif, ''), '\D', '', 'g') = regexp_replace(coalesce(p_documento, ''), '\D', '', 'g')
    and regexp_replace(coalesce(p_documento, ''), '\D', '', 'g') <> ''
  order by creado_en
  limit 5;
$$;

-- ============================================================
-- 5) Inventario de la tienda
-- ============================================================
create table if not exists public.inventario_articulos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,                          -- opcional: código interno
  nombre text not null,
  categoria text,                              -- Sillas, Mesas, Colchones, Juegos de recibo…
  producto_id text,                            -- el mueble de la página, si es el mismo
  ubicacion text not null default 'Tienda',
  precio_venta numeric not null default 0 check (precio_venta >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  foto_url text,
  activo boolean not null default true,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists inventario_articulos_categoria_idx on public.inventario_articulos (categoria);

drop trigger if exists inventario_articulos_actualizado on public.inventario_articulos;
create trigger inventario_articulos_actualizado before update on public.inventario_articulos
  for each row execute function public._mz_tocar_actualizado();

-- Costo de cada artículo: aparte, porque solo lo ve quien tiene "finanzas".
create table if not exists public.inventario_costos (
  articulo_id uuid primary key references public.inventario_articulos(id) on delete cascade,
  costo_unitario numeric not null default 0 check (costo_unitario >= 0),
  actualizado_en timestamptz not null default now()
);

-- Cada entrada o salida de mercancía. No se edita: si hubo un error,
-- se corrige con un "ajuste" (así queda el rastro).
create table if not exists public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  articulo_id uuid not null references public.inventario_articulos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida_venta', 'devolucion', 'ajuste')),
  cantidad int not null check (cantidad <> 0),  -- + entra, − sale
  pedido_id uuid references public.pedidos(id) on delete set null,
  nota text,
  creado_por uuid default auth.uid() references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint inventario_movimientos_signo check (
    (tipo = 'entrada' and cantidad > 0) or
    (tipo = 'devolucion' and cantidad > 0) or
    (tipo = 'salida_venta' and cantidad < 0) or
    tipo = 'ajuste'
  )
);
create index if not exists inventario_mov_articulo_idx on public.inventario_movimientos (articulo_id);
create index if not exists inventario_mov_pedido_idx on public.inventario_movimientos (pedido_id);

-- ============================================================
-- 6) Ventas (tabla "pedidos"): tipo, fechas, vendedor
-- ============================================================
alter table public.pedidos
  add column if not exists tipo_venta text not null default 'contado',
  add column if not exists fecha_venta date,
  add column if not exists abono_minimo_pct numeric not null default 35
    check (abono_minimo_pct between 0 and 100),
  add column if not exists fecha_limite_pago date,
  add column if not exists vendedor_id uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists entregado_en timestamptz,
  add column if not exists entrega_con_deuda_por uuid references auth.users(id) on delete set null;

alter table public.pedidos drop constraint if exists pedidos_tipo_venta_check;
alter table public.pedidos add constraint pedidos_tipo_venta_check
  check (tipo_venta in ('contado', 'apartado', 'credito'));

-- Los pedidos viejos toman como fecha de venta el día en que se crearon.
update public.pedidos set fecha_venta = creado_en::date where fecha_venta is null;
alter table public.pedidos alter column fecha_venta set default current_date;
alter table public.pedidos alter column fecha_venta set not null;

create index if not exists pedidos_fecha_venta_idx on public.pedidos (fecha_venta);
create index if not exists pedidos_fecha_limite_idx on public.pedidos (fecha_limite_pago);

-- Muebles de la venta: del inventario, del catálogo o a medida.
alter table public.pedido_items
  add column if not exists articulo_id uuid references public.inventario_articulos(id) on delete set null,
  add column if not exists detalle text;   -- medidas, acabados, cómo va el mueble a medida
create index if not exists pedido_items_articulo_idx on public.pedido_items (articulo_id);

-- Abonos: partes, moneda, tasa, referencia, quién lo registró y anulación.
alter table public.pedido_pagos
  add column if not exists grupo_id uuid,            -- las partes de un mismo abono comparten grupo
  add column if not exists moneda text not null default 'USD',
  add column if not exists monto_moneda numeric,     -- lo que entregó en esa moneda (ej. en Bs)
  add column if not exists tasa_cambio numeric,      -- Bs por 1 € o 1 $ ese día
  add column if not exists tasa_tipo text,           -- 'eur' | 'usd' | 'otra'
  add column if not exists referencia text,
  add column if not exists banco text,
  add column if not exists registrado_por uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists registrado_en timestamptz not null default now(),
  add column if not exists anulado boolean not null default false,
  add column if not exists anulado_por uuid references auth.users(id) on delete set null,
  add column if not exists anulado_en timestamptz,
  add column if not exists motivo_anulacion text;

alter table public.pedido_pagos drop constraint if exists pedido_pagos_moneda_check;
alter table public.pedido_pagos add constraint pedido_pagos_moneda_check check (moneda in ('USD', 'VES'));
alter table public.pedido_pagos drop constraint if exists pedido_pagos_tasa_tipo_check;
alter table public.pedido_pagos add constraint pedido_pagos_tasa_tipo_check
  check (tasa_tipo is null or tasa_tipo in ('eur', 'usd', 'otra'));
create index if not exists pedido_pagos_grupo_idx on public.pedido_pagos (grupo_id);
create index if not exists pedido_pagos_fecha_idx on public.pedido_pagos (fecha);

-- Recibos: cada abono tiene el suyo.
alter table public.recibos
  add column if not exists pago_id uuid references public.pedido_pagos(id) on delete set null,
  add column if not exists grupo_pago_id uuid,
  add column if not exists pagos jsonb not null default '[]',   -- las partes del abono
  add column if not exists pagado_antes numeric not null default 0,
  add column if not exists anulado boolean not null default false;
create index if not exists recibos_grupo_idx on public.recibos (grupo_pago_id);

-- Avisos de cobranza que se le mandaron a cada cliente por WhatsApp.
create table if not exists public.cobranza_avisos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  tipo text not null default 'recordatorio' check (tipo in ('recordatorio', 'vence_hoy', 'vencido', 'listo_para_entregar')),
  enviado_por uuid default auth.uid() references auth.users(id) on delete set null,
  enviado_en timestamptz not null default now()
);
create index if not exists cobranza_avisos_pedido_idx on public.cobranza_avisos (pedido_id);

-- Cierre de caja de cada día.
create table if not exists public.cierres_caja (
  fecha date primary key,
  sin_ventas boolean not null default false,   -- "hoy no se vendió nada"
  lineas jsonb not null default '[]',          -- [{metodo, moneda, sistema, contado}]
  notas text,
  cerrado_por uuid default auth.uid() references auth.users(id) on delete set null,
  cerrado_en timestamptz not null default now()
);

-- ============================================================
-- 7) Automático: fechas, entrega con deuda y stock
-- ============================================================

-- Resta de una venta (total − abonos válidos).
create or replace function public._mz_resta_venta(p_pedido_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((select sum(cantidad * precio_unitario) from public.pedido_items where pedido_id = p_pedido_id), 0)
      - coalesce((select descuento from public.pedidos where id = p_pedido_id), 0)
      - coalesce((select sum(monto) from public.pedido_pagos where pedido_id = p_pedido_id and not anulado), 0),
    0);
$$;

-- Apartado y crédito reciben su fecha límite (fecha de venta + plazo).
create or replace function public._mz_venta_fechas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meses int;
  v_pct numeric;
begin
  select plazo_apartado_meses, abono_minimo_pct into v_meses, v_pct
  from public.negocio_datos where id = 1;
  v_meses := coalesce(v_meses, 2);

  if tg_op = 'INSERT' then
    new.abono_minimo_pct := case when new.tipo_venta = 'apartado' then coalesce(v_pct, 35) else 0 end;
  elsif new.tipo_venta is distinct from old.tipo_venta then
    new.abono_minimo_pct := case when new.tipo_venta = 'apartado' then coalesce(v_pct, 35) else 0 end;
  end if;

  if new.tipo_venta in ('apartado', 'credito') then
    if new.fecha_limite_pago is null
       or (tg_op = 'UPDATE' and old.tipo_venta = 'contado')
       or (tg_op = 'UPDATE' and old.fecha_venta is distinct from new.fecha_venta
           and old.fecha_limite_pago is not distinct from new.fecha_limite_pago) then
      new.fecha_limite_pago := (new.fecha_venta + make_interval(months => v_meses))::date;
    end if;
  elsif tg_op = 'UPDATE' and old.tipo_venta <> 'contado' then
    new.fecha_limite_pago := null;  -- pasó a contado
  end if;

  if new.estado = 'entregado' and (tg_op = 'INSERT' or old.estado is distinct from 'entregado') then
    new.entregado_en := now();
  elsif new.estado <> 'entregado' then
    new.entregado_en := null;
    new.entrega_con_deuda_por := null;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_fechas on public.pedidos;
create trigger pedidos_fechas before insert or update on public.pedidos
  for each row execute function public._mz_venta_fechas();

-- No se entrega con deuda, salvo que lo autorice el dueño ("finanzas").
create or replace function public._mz_entrega_con_deuda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resta numeric;
begin
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    v_resta := public._mz_resta_venta(new.id);
    if v_resta > 0.009 then
      if auth.uid() is null or public.mz_puede('finanzas') then
        new.entrega_con_deuda_por := auth.uid();
      else
        raise exception 'Esta venta todavía debe $%. Solo el dueño puede entregarla con deuda.', round(v_resta, 2);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_deuda on public.pedidos;
create trigger pedidos_deuda before update of estado on public.pedidos
  for each row execute function public._mz_entrega_con_deuda();

-- Al marcar "Entregado": sale del stock físico lo que venía del
-- inventario. Si se desmarca, vuelve. (Nunca se descuenta dos veces.)
create or replace function public._mz_venta_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado = 'entregado' then
    for r in
      select i.articulo_id,
             sum(i.cantidad) as vendidos,
             coalesce((select sum(m.cantidad) from public.inventario_movimientos m
                       where m.pedido_id = new.id and m.articulo_id = i.articulo_id
                         and m.tipo in ('salida_venta', 'devolucion')), 0) as ya_movido
      from public.pedido_items i
      where i.pedido_id = new.id and i.articulo_id is not null
      group by i.articulo_id
    loop
      if r.vendidos + r.ya_movido > 0 then
        insert into public.inventario_movimientos (articulo_id, tipo, cantidad, pedido_id, nota)
        values (r.articulo_id, 'salida_venta', -(r.vendidos + r.ya_movido), new.id, 'Entregado: venta #' || new.numero);
      end if;
    end loop;
  elsif old.estado = 'entregado' then
    for r in
      select m.articulo_id, sum(m.cantidad) as neto
      from public.inventario_movimientos m
      where m.pedido_id = new.id and m.tipo in ('salida_venta', 'devolucion')
      group by m.articulo_id
    loop
      if r.neto < 0 then
        insert into public.inventario_movimientos (articulo_id, tipo, cantidad, pedido_id, nota)
        values (r.articulo_id, 'devolucion', -r.neto, new.id, 'Se desmarcó "Entregado": venta #' || new.numero);
      end if;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_stock on public.pedidos;
create trigger pedidos_stock after update of estado on public.pedidos
  for each row execute function public._mz_venta_stock();

-- Anular un abono solo lo puede hacer quien tiene "finanzas".
create or replace function public._mz_proteger_abonos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.anulado is distinct from old.anulado
      or new.motivo_anulacion is distinct from old.motivo_anulacion)
     and not public.mz_puede('finanzas') then
    raise exception 'Solo el dueño (o quien tenga el permiso "finanzas") puede anular un abono.';
  end if;
  if old.anulado and not public.mz_puede('finanzas') then
    raise exception 'Este abono está anulado y no se puede cambiar.';
  end if;
  return new;
end $$;

-- Un abono de una sola parte es su propio grupo.
create or replace function public._mz_pago_grupo()
returns trigger
language plpgsql
as $$
begin
  new.grupo_id := coalesce(new.grupo_id, new.id);
  return new;
end $$;

drop trigger if exists pedido_pagos_grupo on public.pedido_pagos;
create trigger pedido_pagos_grupo before insert on public.pedido_pagos
  for each row execute function public._mz_pago_grupo();

drop trigger if exists pedido_pagos_proteger on public.pedido_pagos;
create trigger pedido_pagos_proteger before update on public.pedido_pagos
  for each row execute function public._mz_proteger_abonos();

-- Los abonos que ya existían: cada uno es su propio grupo.
update public.pedido_pagos set grupo_id = id where grupo_id is null;

-- ============================================================
-- 8) Vistas para la app
-- ============================================================

-- Una fila por venta con todo calculado. Solo la ve quien tiene "dinero".
drop view if exists public.ventas_resumen cascade;
create view public.ventas_resumen as
with
  it as (
    select pedido_id, sum(cantidad * precio_unitario) as subtotal, sum(cantidad) as piezas
    from public.pedido_items group by pedido_id
  ),
  pg as (
    select pedido_id, sum(monto) as pagado, max(fecha) as ultimo_pago, count(distinct coalesce(grupo_id, id)) as abonos
    from public.pedido_pagos where not anulado group by pedido_id
  ),
  av as (
    select pedido_id, max(enviado_en) as ultimo_aviso from public.cobranza_avisos group by pedido_id
  ),
  base as (
    select
      p.*,
      c.nombre as cliente_nombre,
      c.telefono as cliente_telefono,
      c.cedula_rif as cliente_documento,
      coalesce(it.piezas, 0) as piezas,
      greatest(coalesce(it.subtotal, 0) - coalesce(p.descuento, 0), 0) as total,
      coalesce(pg.pagado, 0) as pagado,
      coalesce(pg.abonos, 0) as abonos,
      pg.ultimo_pago,
      av.ultimo_aviso,
      coalesce((select n.dias_aviso_cobranza from public.negocio_datos n where n.id = 1), 7) as dias_aviso
    from public.pedidos p
    left join public.clientes c on c.id = p.cliente_id
    left join it on it.pedido_id = p.id
    left join pg on pg.pedido_id = p.id
    left join av on av.pedido_id = p.id
  ),
  calc as (
    select b.*,
      greatest(b.total - b.pagado, 0) as resta,
      case when b.fecha_limite_pago is null then null else b.fecha_limite_pago - current_date end as dias_para_vencer
    from base b
  )
select
  id, numero, cliente_id, cliente_nombre, cliente_telefono, cliente_documento,
  tipo_venta, estado, fecha_venta, fecha_limite_pago, fecha_entrega, entregado_en,
  entrega_con_deuda_por, vendedor_id, descuento, notas, piezas, total, pagado, resta,
  abonos, ultimo_pago, ultimo_aviso, abono_minimo_pct, dias_para_vencer,
  round(case when total > 0 then pagado / total * 100 else 100 end, 1) as pct_pagado,
  (pagado + 0.009 >= total * abono_minimo_pct / 100) as abono_minimo_ok,
  case
    when estado = 'cancelado' then 'cancelado'
    when resta <= 0.009 then 'pagado'
    when pagado = 0 then 'sin_abono'
    else 'abono_pendiente'
  end as estado_pago,
  -- Semáforo de cobranza: vencido (rojo), por_vencer (amarillo), al_dia (verde)
  case
    when estado = 'cancelado' or resta <= 0.009 then null
    when fecha_limite_pago is null then case when estado = 'entregado' then 'vencido' else null end
    when dias_para_vencer < 0 then 'vencido'
    when dias_para_vencer <= dias_aviso then 'por_vencer'
    else 'al_dia'
  end as alerta_cobranza,
  -- Lo que se muestra en la lista: pago + entrega en una sola frase
  case
    when estado = 'cancelado' then 'Cancelado'
    when estado = 'entregado' and resta > 0.009 then 'Entregado – con deuda'
    when estado = 'entregado' then 'Entregado'
    when resta <= 0.009 then 'Pagó total – falta por entregar'
    when fecha_limite_pago is not null and dias_para_vencer < 0 then 'Plazo vencido'
    when pagado > 0 then 'Abono pendiente'
    else 'Sin abono'
  end as situacion,
  creado_en, actualizado_en
from calc
where public.mz_puede('dinero');

-- Stock por artículo: físico (en la tienda), apartado (vendido sin
-- entregar) y disponible para vender. Lo ve quien vende o maneja inventario.
drop view if exists public.inventario_stock cascade;
create view public.inventario_stock as
select
  a.id as articulo_id, a.codigo, a.nombre, a.categoria, a.producto_id, a.ubicacion,
  a.precio_venta, a.stock_minimo, a.foto_url, a.activo, a.notas,
  coalesce(m.fisico, 0) as fisico,
  coalesce(r.apartado, 0) as apartado,
  coalesce(m.fisico, 0) - coalesce(r.apartado, 0) as disponible,
  (coalesce(m.fisico, 0) - coalesce(r.apartado, 0)) <= a.stock_minimo as bajo_minimo,
  m.ultimo_movimiento
from public.inventario_articulos a
left join (
  select articulo_id, sum(cantidad) as fisico, max(creado_en) as ultimo_movimiento
  from public.inventario_movimientos group by articulo_id
) m on m.articulo_id = a.id
left join (
  select i.articulo_id, sum(i.cantidad) as apartado
  from public.pedido_items i
  join public.pedidos p on p.id = i.pedido_id
  where i.articulo_id is not null and p.estado not in ('entregado', 'cancelado')
  group by i.articulo_id
) r on r.articulo_id = a.id
where public.mz_puede('inventario') or public.mz_puede('pedidos');

revoke all on public.ventas_resumen from anon, public;
revoke all on public.inventario_stock from anon, public;
grant select on public.ventas_resumen to authenticated;
grant select on public.inventario_stock to authenticated;

-- ============================================================
-- 9) Funciones para la app
-- ============================================================

-- Las funciones de una versión anterior de este archivo.
drop function if exists public.mz_registrar_abono(uuid, numeric, text, date, text, numeric, numeric, text, text, text);
drop function if exists public.mz_anular_abono(uuid, text);

-- Registra un abono (una o varias partes) y crea su recibo.
-- p_partes = [{ metodo, moneda: 'USD'|'VES', monto (en $), monto_moneda (en Bs),
--               tasa_cambio, tasa_tipo: 'eur'|'usd'|'otra', referencia?, banco? }]
-- En Bs: se pasa monto_moneda y tasa_cambio; el equivalente en $ se calcula solo.
create or replace function public.mz_registrar_abono(
  p_pedido_id uuid,
  p_partes jsonb,
  p_fecha date default current_date,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.ventas_resumen;
  v_grupo uuid := gen_random_uuid();
  v_parte jsonb;
  v_monto numeric;
  v_moneda text;
  v_suma numeric := 0;
  v_partes_ok jsonb := '[]';
  v_formas text[] := '{}';
  v_ref text;
  v_banco text;
  v_cliente public.clientes;
  v_recibo public.recibos;
  v_primer_pago uuid;
  v_id uuid;
begin
  if not public.mz_puede('dinero') then
    raise exception 'No tienes permiso para registrar abonos.';
  end if;
  select * into v from public.ventas_resumen where id = p_pedido_id;
  if not found then
    raise exception 'Esta venta no existe.';
  end if;
  if v.estado = 'cancelado' then
    raise exception 'La venta está cancelada: no se le pueden registrar abonos.';
  end if;
  if jsonb_typeof(p_partes) <> 'array' or jsonb_array_length(p_partes) = 0 then
    raise exception 'Escribe el monto del abono.';
  end if;

  -- Revisar y convertir cada parte
  for v_parte in select * from jsonb_array_elements(p_partes) loop
    v_moneda := coalesce(nullif(v_parte->>'moneda', ''), 'USD');
    if v_moneda not in ('USD', 'VES') then
      raise exception 'Moneda inválida: %', v_moneda;
    end if;
    if v_moneda = 'VES' then
      if coalesce((v_parte->>'monto_moneda')::numeric, 0) <= 0 or coalesce((v_parte->>'tasa_cambio')::numeric, 0) <= 0 then
        raise exception 'Para un pago en bolívares escribe el monto en Bs y la tasa.';
      end if;
      v_monto := round((v_parte->>'monto_moneda')::numeric / (v_parte->>'tasa_cambio')::numeric, 2);
    else
      v_monto := round(coalesce((v_parte->>'monto')::numeric, 0), 2);
    end if;
    if v_monto <= 0 then
      raise exception 'Cada parte del abono debe tener un monto.';
    end if;
    v_suma := v_suma + v_monto;
    v_partes_ok := v_partes_ok || jsonb_build_array(v_parte || jsonb_build_object('monto', v_monto, 'moneda', v_moneda));
  end loop;

  if v_suma > v.resta + 0.009 then
    raise exception 'El abono ($%) es mayor que lo que resta ($%).', v_suma, round(v.resta, 2);
  end if;

  for v_parte in select * from jsonb_array_elements(v_partes_ok) loop
    insert into public.pedido_pagos (pedido_id, grupo_id, monto, metodo, fecha, nota, moneda, monto_moneda,
                                     tasa_cambio, tasa_tipo, referencia, banco)
    values (
      p_pedido_id, v_grupo, (v_parte->>'monto')::numeric,
      nullif(trim(v_parte->>'metodo'), ''),
      coalesce(p_fecha, current_date),
      nullif(trim(p_nota), ''),
      v_parte->>'moneda',
      case when v_parte->>'moneda' = 'VES' then (v_parte->>'monto_moneda')::numeric end,
      case when v_parte->>'moneda' = 'VES' then (v_parte->>'tasa_cambio')::numeric end,
      case when v_parte->>'moneda' = 'VES' then coalesce(nullif(v_parte->>'tasa_tipo', ''), 'eur') end,
      nullif(trim(v_parte->>'referencia'), ''),
      nullif(trim(v_parte->>'banco'), '')
    )
    returning id into v_id;
    v_primer_pago := coalesce(v_primer_pago, v_id);
    v_ref := coalesce(v_ref, nullif(trim(v_parte->>'referencia'), ''));
    v_banco := coalesce(v_banco, nullif(trim(v_parte->>'banco'), ''));
    v_formas := v_formas || case
      when v_parte->>'metodo' ilike 'efectivo%' then 'efectivo'
      when v_parte->>'metodo' ilike 'punto%' then 'punto_venta'
      when v_parte->>'metodo' ilike any (array['zelle%', 'pago m%', 'transfer%']) then 'cheque_transferencia'
      else 'otros'
    end;
  end loop;

  -- Recibo de este abono (foto fija de ese momento)
  select * into v_cliente from public.clientes where id = v.cliente_id;
  insert into public.recibos (
    pedido_id, pago_id, grupo_pago_id, fecha, cliente_nombre, cliente_domicilio, cliente_telefono, cliente_ci_rif,
    condicion_pago, dias_credito, formas_pago, referencia, banco, items, observaciones,
    abono, resta, total, pagado_antes, pagos, creado_por
  ) values (
    p_pedido_id, v_primer_pago, v_grupo, coalesce(p_fecha, current_date),
    coalesce(v_cliente.nombre, v.cliente_nombre, 'Cliente'), v_cliente.direccion, v_cliente.telefono, v_cliente.cedula_rif,
    case when v.tipo_venta = 'contado' then 'contado' else 'credito' end,
    case when v.fecha_limite_pago is not null then v.fecha_limite_pago - v.fecha_venta end,
    (select coalesce(array_agg(distinct f), '{}') from unnest(v_formas) f),
    v_ref, v_banco,
    coalesce((select jsonb_agg(jsonb_build_object(
        'cantidad', i.cantidad,
        'descripcion', concat_ws(' — ', i.descripcion, nullif(i.tela_color, ''), nullif(i.detalle, '')),
        'precio_unitario', i.precio_unitario,
        'total', i.cantidad * i.precio_unitario) order by i.orden)
      from public.pedido_items i where i.pedido_id = p_pedido_id), '[]'::jsonb),
    nullif(trim(p_nota), ''),
    v_suma, greatest(v.resta - v_suma, 0), v.total, v.pagado, v_partes_ok, auth.uid()
  ) returning * into v_recibo;

  select * into v from public.ventas_resumen where id = p_pedido_id;
  return jsonb_build_object(
    'grupo_id', v_grupo, 'recibo_id', v_recibo.id, 'recibo_numero', v_recibo.numero,
    'abono', v_suma, 'pagado', v.pagado, 'resta', v.resta, 'situacion', v.situacion);
end $$;

-- Guarda una venta completa (cliente, renglones y abono inicial) de una
-- sola vez: o se guarda todo o no se guarda nada. Revisa el stock, el
-- pago completo del contado y el abono mínimo del apartado.
--
-- p_venta = {
--   id?, cliente_id, tipo_venta: 'contado'|'apartado'|'credito', fecha_venta?,
--   fecha_limite_pago?, fecha_entrega?, descuento?, notas?, estado?,
--   items: [{ descripcion, detalle?, tela_color?, cantidad, precio_unitario,
--             producto_id?, articulo_id? }],
--   abono_inicial?: { fecha?, nota?, partes: [ ...igual que mz_registrar_abono... ] }
-- }
create or replace function public.mz_guardar_venta(p_venta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p_venta->>'id', '')::uuid;
  v_nuevo boolean := v_id is null;
  v_pedido public.pedidos;
  v_tipo text := coalesce(nullif(p_venta->>'tipo_venta', ''), 'contado');
  v_items jsonb := coalesce(p_venta->'items', '[]'::jsonb);
  v_item jsonb;
  v_total numeric := 0;
  v_abono jsonb := p_venta->'abono_inicial';
  v_partes jsonb;
  v_parte jsonb;
  v_monto numeric := 0;
  v_min numeric;
  v_pct numeric;
  v_res_abono jsonb;
  r record;
  i int := 0;
begin
  if not public.mz_puede('pedidos') or not public.mz_puede('dinero') then
    raise exception 'No tienes permiso para facturar (hacen falta "Pedidos" y "Precios y pagos").';
  end if;
  if v_tipo not in ('contado', 'apartado', 'credito') then
    raise exception 'Tipo de venta inválido: %', v_tipo;
  end if;
  if nullif(p_venta->>'cliente_id', '') is null
     or not exists (select 1 from public.clientes where id = (p_venta->>'cliente_id')::uuid) then
    raise exception 'Elige o registra el cliente de la venta.';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Agrega al menos un mueble a la venta.';
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    if coalesce(trim(v_item->>'descripcion'), '') = '' then
      raise exception 'Hay un renglón sin descripción.';
    end if;
    if coalesce((v_item->>'cantidad')::int, 0) < 1 then
      raise exception 'La cantidad de "%" debe ser 1 o más.', v_item->>'descripcion';
    end if;
    if coalesce((v_item->>'precio_unitario')::numeric, 0) < 0 then
      raise exception 'El precio de "%" no puede ser negativo.', v_item->>'descripcion';
    end if;
    v_total := v_total + (v_item->>'cantidad')::int * coalesce((v_item->>'precio_unitario')::numeric, 0);
  end loop;
  v_total := greatest(v_total - coalesce((p_venta->>'descuento')::numeric, 0), 0);

  if not v_nuevo then
    select * into v_pedido from public.pedidos where id = v_id for update;
    if not found then
      raise exception 'Esta venta no existe o fue borrada.';
    end if;
    if v_pedido.estado in ('entregado', 'cancelado') then
      raise exception 'No se pueden cambiar los muebles de una venta entregada o cancelada.';
    end if;
  end if;

  -- Stock: lo pedido de cada artículo no puede pasar de lo disponible
  -- (sin contar lo que esta misma venta ya tenía apartado).
  for r in
    select (x->>'articulo_id')::uuid as articulo_id, sum((x->>'cantidad')::int) as pide
    from jsonb_array_elements(v_items) x
    where nullif(x->>'articulo_id', '') is not null
    group by 1
  loop
    declare
      v_disp int;
      v_nombre text;
      v_propio int;
    begin
      select s.disponible, s.nombre into v_disp, v_nombre
      from public.inventario_stock s where s.articulo_id = r.articulo_id;
      if v_nombre is null then
        raise exception 'Un artículo del inventario ya no existe.';
      end if;
      select coalesce(sum(cantidad), 0) into v_propio
      from public.pedido_items where pedido_id = v_id and articulo_id = r.articulo_id;
      if r.pide > v_disp + v_propio then
        raise exception 'Solo quedan % disponible(s) de "%".', greatest(v_disp + v_propio, 0), v_nombre;
      end if;
    end;
  end loop;

  if v_nuevo then
    -- Partes del abono inicial (también acepta un abono simple {monto, metodo…})
    v_partes := case
      when v_abono is null or jsonb_typeof(v_abono) <> 'object' then '[]'::jsonb
      when jsonb_typeof(v_abono->'partes') = 'array' then v_abono->'partes'
      when coalesce((v_abono->>'monto')::numeric, 0) > 0 then jsonb_build_array(v_abono)
      else '[]'::jsonb
    end;
    for v_parte in select * from jsonb_array_elements(v_partes) loop
      v_monto := v_monto + case
        when coalesce(v_parte->>'moneda', 'USD') = 'VES' and coalesce((v_parte->>'tasa_cambio')::numeric, 0) > 0
          then round(coalesce((v_parte->>'monto_moneda')::numeric, 0) / (v_parte->>'tasa_cambio')::numeric, 2)
        else round(coalesce((v_parte->>'monto')::numeric, 0), 2)
      end;
    end loop;

    select abono_minimo_pct into v_pct from public.negocio_datos where id = 1;
    v_pct := coalesce(v_pct, 35);
    if v_tipo = 'contado' and v_monto + 0.009 < v_total then
      raise exception 'Una venta de contado se paga completa ($%). Si deja solo una parte, márcala como apartado o crédito.', round(v_total, 2);
    end if;
    if v_tipo = 'apartado' then
      v_min := round(v_total * v_pct / 100, 2);
      if v_monto + 0.009 < v_min then
        raise exception 'El apartado exige un abono mínimo del % ($%). Si da menos, márcala como crédito.', v_pct || '%', v_min;
      end if;
    end if;
    if v_monto > v_total + 0.009 then
      raise exception 'El abono ($%) es mayor que el total ($%).', v_monto, round(v_total, 2);
    end if;

    insert into public.pedidos (cliente_id, tipo_venta, fecha_venta, fecha_limite_pago, fecha_entrega, descuento, notas, estado)
    values (
      (p_venta->>'cliente_id')::uuid,
      v_tipo,
      coalesce(nullif(p_venta->>'fecha_venta', '')::date, current_date),
      nullif(p_venta->>'fecha_limite_pago', '')::date,
      nullif(p_venta->>'fecha_entrega', '')::date,
      coalesce((p_venta->>'descuento')::numeric, 0),
      nullif(trim(p_venta->>'notas'), ''),
      coalesce(nullif(p_venta->>'estado', ''), 'confirmado')
    )
    returning * into v_pedido;
  else
    update public.pedidos set
      cliente_id = (p_venta->>'cliente_id')::uuid,
      tipo_venta = v_tipo,
      fecha_venta = coalesce(nullif(p_venta->>'fecha_venta', '')::date, fecha_venta),
      fecha_limite_pago = coalesce(nullif(p_venta->>'fecha_limite_pago', '')::date, fecha_limite_pago),
      fecha_entrega = nullif(p_venta->>'fecha_entrega', '')::date,
      descuento = coalesce((p_venta->>'descuento')::numeric, 0),
      notas = nullif(trim(p_venta->>'notas'), '')
    where id = v_id
    returning * into v_pedido;
    delete from public.pedido_items where pedido_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.pedido_items (pedido_id, producto_id, articulo_id, descripcion, detalle, tela_color, cantidad, precio_unitario, orden)
    values (
      v_pedido.id,
      nullif(v_item->>'producto_id', ''),
      nullif(v_item->>'articulo_id', '')::uuid,
      trim(v_item->>'descripcion'),
      nullif(trim(v_item->>'detalle'), ''),
      nullif(trim(v_item->>'tela_color'), ''),
      (v_item->>'cantidad')::int,
      coalesce((v_item->>'precio_unitario')::numeric, 0),
      i
    );
    i := i + 1;
  end loop;

  if v_nuevo and v_monto > 0 then
    v_res_abono := public.mz_registrar_abono(
      v_pedido.id, v_partes,
      coalesce(nullif(v_abono->>'fecha', '')::date, v_pedido.fecha_venta),
      v_abono->>'nota'
    );
  end if;

  return (
    select jsonb_build_object('id', v.id, 'numero', v.numero, 'total', v.total, 'pagado', v.pagado,
                              'resta', v.resta, 'fecha_limite_pago', v.fecha_limite_pago, 'situacion', v.situacion,
                              'recibo_id', v_res_abono->>'recibo_id')
    from public.ventas_resumen v where v.id = v_pedido.id
  );
end $$;

-- Anula un abono completo (todas sus partes) y su recibo.
-- p_id puede ser el grupo del abono o el id de una de sus partes.
create or replace function public.mz_anular_abono(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo uuid;
begin
  if not public.mz_puede('finanzas') then
    raise exception 'Solo el dueño (o quien tenga el permiso "finanzas") puede anular un abono.';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Escribe por qué se anula el abono.';
  end if;
  select coalesce(grupo_id, id) into v_grupo from public.pedido_pagos
  where (grupo_id = p_id or id = p_id) and not anulado limit 1;
  if v_grupo is null then
    raise exception 'Ese abono no existe o ya estaba anulado.';
  end if;
  update public.pedido_pagos
  set anulado = true, anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = trim(p_motivo)
  where coalesce(grupo_id, id) = v_grupo and not anulado;
  update public.recibos set anulado = true where grupo_pago_id = v_grupo;
end $$;

-- Lo que dice el sistema de un día: cobros por método y ventas.
create or replace function public.mz_caja_dia(p_fecha date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mz_puede('dinero') then
    raise exception 'No tienes permiso para ver la caja.';
  end if;
  return jsonb_build_object(
    'fecha', p_fecha,
    'cobros', coalesce((
      select jsonb_agg(jsonb_build_object('metodo', metodo, 'moneda', moneda, 'monto_usd', usd, 'monto_moneda', bs, 'cantidad', n) order by metodo)
      from (
        select coalesce(metodo, 'Sin indicar') as metodo, moneda, sum(monto) as usd, sum(monto_moneda) as bs, count(*) as n
        from public.pedido_pagos where fecha = p_fecha and not anulado
        group by coalesce(metodo, 'Sin indicar'), moneda
      ) x), '[]'::jsonb),
    'total_usd', (select coalesce(sum(monto), 0) from public.pedido_pagos where fecha = p_fecha and not anulado),
    'ventas', (select jsonb_build_object('cantidad', count(*), 'total', coalesce(sum(total), 0))
               from public.ventas_resumen where fecha_venta = p_fecha and estado <> 'cancelado'),
    'tasa', (select to_jsonb(t) from public.tasas_cambio t where t.fecha = p_fecha),
    'cierre', (select to_jsonb(c) from public.cierres_caja c where c.fecha = p_fecha)
  );
end $$;

-- Tablero: los números del período (por defecto, el mes actual).
create or replace function public.mz_tablero(p_desde date default null, p_hasta date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d date := coalesce(p_desde, date_trunc('month', current_date)::date);
  h date := coalesce(p_hasta, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  d_ant date := (d - interval '1 month')::date;
  h_ant date := least((d - interval '1 day')::date, (d_ant + (least(h, current_date) - d))::date);
  res jsonb;
begin
  if not public.mz_puede('finanzas') then
    raise exception 'El tablero de números es solo para el dueño (permiso "finanzas").';
  end if;

  with v as (select * from public.ventas_resumen where estado <> 'cancelado'),
       pagos as (select * from public.pedido_pagos where not anulado)
  select jsonb_build_object(
    'desde', d, 'hasta', h,
    'ventas', (select jsonb_build_object(
        'cantidad', count(*),
        'total', coalesce(sum(total), 0),
        'contado', coalesce(sum(total) filter (where tipo_venta = 'contado'), 0),
        'apartado', coalesce(sum(total) filter (where tipo_venta = 'apartado'), 0),
        'credito', coalesce(sum(total) filter (where tipo_venta = 'credito'), 0))
      from v where fecha_venta between d and h),
    'cobrado', (select coalesce(sum(monto), 0) from pagos where fecha between d and h),
    'cobrado_por_metodo', (select coalesce(jsonb_object_agg(m, s), '{}'::jsonb)
      from (select coalesce(metodo, 'Sin indicar') m, sum(monto) s from pagos where fecha between d and h group by 1) x),
    -- Mes anterior, hasta el mismo día (para comparar parejo)
    'mes_anterior', jsonb_build_object(
        'desde', d_ant, 'hasta', h_ant,
        'ventas', (select coalesce(sum(total), 0) from v where fecha_venta between d_ant and h_ant),
        'cantidad', (select count(*) from v where fecha_venta between d_ant and h_ant),
        'cobrado', (select coalesce(sum(monto), 0) from pagos where fecha between d_ant and h_ant),
        'dias_con_venta', (select count(distinct fecha_venta) from v where fecha_venta between d_ant and h_ant)),
    'dias', jsonb_build_object(
        'transcurridos', greatest(least(h, current_date) - d + 1, 0),
        'con_venta', (select count(distinct fecha_venta) from v where fecha_venta between d and h),
        'sin_venta_marcados', (select count(*) from public.cierres_caja where sin_ventas and fecha between d and h),
        'cerrados', (select count(*) from public.cierres_caja where fecha between d and h)),
    'por_cobrar', (select jsonb_build_object(
        'total', coalesce(sum(resta), 0),
        'ventas', count(*),
        'vencido', coalesce(sum(resta) filter (where alerta_cobranza = 'vencido'), 0),
        'ventas_vencidas', count(*) filter (where alerta_cobranza = 'vencido'),
        'por_vencer', coalesce(sum(resta) filter (where alerta_cobranza = 'por_vencer'), 0),
        'ventas_por_vencer', count(*) filter (where alerta_cobranza = 'por_vencer'),
        'entregado_con_deuda', coalesce(sum(resta) filter (where estado = 'entregado'), 0),
        'ventas_entregadas_con_deuda', count(*) filter (where estado = 'entregado'))
      from v where resta > 0.009),
    'entregas', (select jsonb_build_object(
        'pagadas_sin_entregar', count(*) filter (where estado_pago = 'pagado' and estado <> 'entregado'),
        'en_fabricacion', count(*) filter (where estado = 'fabricacion'),
        'listas', count(*) filter (where estado = 'listo'),
        'atrasadas', count(*) filter (where fecha_entrega < current_date and estado <> 'entregado'),
        'entregadas_periodo', count(*) filter (where entregado_en::date between d and h))
      from v),
    'inventario', (select jsonb_build_object(
        'articulos', count(*) filter (where s.activo),
        'piezas', coalesce(sum(s.fisico) filter (where s.activo), 0),
        'bajo_minimo', count(*) filter (where s.activo and s.bajo_minimo),
        'valor_costo', coalesce(sum(s.fisico * coalesce(c.costo_unitario, 0)) filter (where s.activo), 0),
        'valor_venta', coalesce(sum(s.fisico * s.precio_venta) filter (where s.activo), 0))
      from public.inventario_stock s left join public.inventario_costos c on c.articulo_id = s.articulo_id),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object(
          'fecha', dia, 'ventas', ventas, 'cantidad', cantidad, 'cobrado', cobrado, 'sin_ventas', sin_ventas) order by dia), '[]'::jsonb)
      from (
        select g::date as dia,
          (select coalesce(sum(total), 0) from v where fecha_venta = g::date) as ventas,
          (select count(*) from v where fecha_venta = g::date) as cantidad,
          (select coalesce(sum(monto), 0) from pagos where fecha = g::date) as cobrado,
          coalesce((select c.sin_ventas from public.cierres_caja c where c.fecha = g::date), false) as sin_ventas
        from generate_series(d, h, interval '1 day') g
      ) x),
    'por_mes', (select coalesce(jsonb_agg(jsonb_build_object(
          'mes', to_char(m, 'YYYY-MM'), 'ventas', ventas, 'cantidad', cantidad, 'cobrado', cobrado, 'dias_con_venta', dias) order by m), '[]'::jsonb)
      from (
        select m,
          (select coalesce(sum(total), 0) from v where date_trunc('month', fecha_venta) = m) as ventas,
          (select count(*) from v where date_trunc('month', fecha_venta) = m) as cantidad,
          (select coalesce(sum(monto), 0) from pagos where date_trunc('month', fecha) = m) as cobrado,
          (select count(distinct fecha_venta) from v where date_trunc('month', fecha_venta) = m) as dias
        from generate_series(date_trunc('month', h) - interval '11 months', date_trunc('month', h), interval '1 month') m
      ) x)
  ) into res;
  return res;
end $$;

revoke all on function public.mz_buscar_cliente_documento(text) from public, anon;
revoke all on function public.mz_guardar_venta(jsonb) from public, anon;
revoke all on function public.mz_registrar_abono(uuid, jsonb, date, text) from public, anon;
revoke all on function public.mz_anular_abono(uuid, text) from public, anon;
revoke all on function public.mz_caja_dia(date) from public, anon;
revoke all on function public.mz_tablero(date, date) from public, anon;
revoke all on function public._mz_resta_venta(uuid) from public, anon;
grant execute on function public.mz_buscar_cliente_documento(text) to authenticated;
grant execute on function public.mz_guardar_venta(jsonb) to authenticated;
grant execute on function public.mz_registrar_abono(uuid, jsonb, date, text) to authenticated;
grant execute on function public.mz_anular_abono(uuid, text) to authenticated;
grant execute on function public.mz_caja_dia(date) to authenticated;
grant execute on function public.mz_tablero(date, date) to authenticated;

-- ============================================================
-- 10) Seguridad de las tablas nuevas
-- ============================================================
alter table public.inventario_articulos enable row level security;
alter table public.inventario_costos enable row level security;
alter table public.inventario_movimientos enable row level security;
alter table public.tasas_cambio enable row level security;
alter table public.cobranza_avisos enable row level security;
alter table public.cierres_caja enable row level security;

drop policy if exists "ver articulos" on public.inventario_articulos;
drop policy if exists "manejar articulos" on public.inventario_articulos;
create policy "ver articulos" on public.inventario_articulos for select to authenticated
  using (public.mz_puede('inventario') or public.mz_puede('pedidos'));
create policy "manejar articulos" on public.inventario_articulos for all to authenticated
  using (public.mz_puede('inventario')) with check (public.mz_puede('inventario'));

drop policy if exists "costos" on public.inventario_costos;
create policy "costos" on public.inventario_costos for all to authenticated
  using (public.mz_puede('finanzas')) with check (public.mz_puede('finanzas'));

drop policy if exists "ver movimientos" on public.inventario_movimientos;
drop policy if exists "registrar movimientos" on public.inventario_movimientos;
drop policy if exists "borrar movimientos" on public.inventario_movimientos;
create policy "ver movimientos" on public.inventario_movimientos for select to authenticated
  using (public.mz_puede('inventario'));
create policy "registrar movimientos" on public.inventario_movimientos for insert to authenticated
  with check (public.mz_puede('inventario') and tipo in ('entrada', 'ajuste', 'devolucion'));
create policy "borrar movimientos" on public.inventario_movimientos for delete to authenticated
  using (public.mz_es_dueno());

drop policy if exists "ver tasas" on public.tasas_cambio;
drop policy if exists "anotar tasas" on public.tasas_cambio;
drop policy if exists "cambiar tasas" on public.tasas_cambio;
create policy "ver tasas" on public.tasas_cambio for select to authenticated
  using (public.mz_puede('dinero'));
create policy "anotar tasas" on public.tasas_cambio for insert to authenticated
  with check (public.mz_puede('dinero'));
create policy "cambiar tasas" on public.tasas_cambio for update to authenticated
  using (public.mz_puede('dinero')) with check (public.mz_puede('dinero'));

drop policy if exists "avisos" on public.cobranza_avisos;
create policy "avisos" on public.cobranza_avisos for all to authenticated
  using (public.mz_puede('dinero')) with check (public.mz_puede('dinero'));

-- Caja: la cierra quien maneja dinero. Cambiar un cierre ya hecho:
-- quien lo hizo (ese mismo día) o el dueño.
drop policy if exists "ver cierres" on public.cierres_caja;
drop policy if exists "hacer cierre" on public.cierres_caja;
drop policy if exists "cambiar cierre" on public.cierres_caja;
drop policy if exists "borrar cierre" on public.cierres_caja;
create policy "ver cierres" on public.cierres_caja for select to authenticated
  using (public.mz_puede('dinero'));
create policy "hacer cierre" on public.cierres_caja for insert to authenticated
  with check (public.mz_puede('dinero'));
create policy "cambiar cierre" on public.cierres_caja for update to authenticated
  using (public.mz_puede('finanzas') or (public.mz_puede('dinero') and cerrado_por = auth.uid() and fecha >= current_date - 1))
  with check (public.mz_puede('dinero'));
create policy "borrar cierre" on public.cierres_caja for delete to authenticated
  using (public.mz_puede('finanzas'));

revoke all on public.inventario_articulos from anon;
revoke all on public.inventario_costos from anon;
revoke all on public.inventario_movimientos from anon;
revoke all on public.tasas_cambio from anon;
revoke all on public.cobranza_avisos from anon;
revoke all on public.cierres_caja from anon;
grant select, insert, update, delete on public.inventario_articulos to authenticated;
grant select, insert, update, delete on public.inventario_costos to authenticated;
grant select, insert, delete on public.inventario_movimientos to authenticated;
grant select, insert, update on public.tasas_cambio to authenticated;
grant select, insert, delete on public.cobranza_avisos to authenticated;
grant select, insert, update, delete on public.cierres_caja to authenticated;
