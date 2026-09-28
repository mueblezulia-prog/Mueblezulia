-- ============================================================
-- Fase 1.21 — Permisos por usuario (dueño, vendedor, taller…)
-- ============================================================
-- Esto hace que CADA usuario solo pueda tocar lo que tú le permitas,
-- tanto en el panel de la página como en la app de gestión:
--   • Dueño ........ todo (incluido crear usuarios y dar permisos)
--   • Vendedor ..... pedidos, clientes, precios y pagos
--   • Taller ....... ver y actualizar pedidos (SIN precios ni pagos)
--   • Página web ... muebles, telas, fotos, contenido y estadísticas
--   • Personalizado  eliges tú los permisos uno por uno
--
-- La protección está en la BASE DE DATOS (no solo en los botones): aunque
-- alguien intente "saltarse" la pantalla, Supabase no le deja hacer nada
-- que no tenga permitido.
--
-- ⚠️ ESTE ARCHIVO REEMPLAZA A fase_1_17. Si todavía no corriste la 1_17,
--    ya no hace falta: corre esta en su lugar. Si ya la corriste, no pasa
--    nada, esta la reemplaza.
--
-- ⚠️ ORDEN (igual que antes, para no quedarte fuera):
--   1. Ya corriste fase_1_16, fase_1_18, fase_1_19 y fase_1_20.
--   2. Subiste la nueva versión de la página y entraste al panel con tu
--      usuario (sraikuervalbuena) sin problema.
--   3. Recién ahí corre ESTE archivo: SQL Editor → pega todo → Run.
--
-- Todos los usuarios que ya existen quedan como DUEÑO (nadie pierde
-- acceso). Después, desde "Usuarios", le cambias el rol a cada uno.
-- Es seguro correrlo más de una vez.

create extension if not exists pgcrypto with schema extensions;

-- ---------- PERFILES (rol y permisos de cada usuario) ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'personalizado'
    check (rol in ('dueno', 'vendedor', 'taller', 'web', 'personalizado')),
  permisos text[] not null default '{}',
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);

-- Los usuarios que ya existen = dueños (así nadie se queda fuera).
insert into public.perfiles (id, rol)
select id, 'dueno' from auth.users
on conflict (id) do nothing;

-- ---------- ¿Puede el usuario actual hacer X? ----------
create or replace function public.mz_puede(p_permiso text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid()
      and activo
      and (rol = 'dueno' or p_permiso = any (permisos))
  );
$$;

create or replace function public.mz_es_dueno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'dueno');
$$;

revoke all on function public.mz_puede(text) from public;
revoke all on function public.mz_es_dueno() from public;
grant execute on function public.mz_puede(text) to anon, authenticated;
grant execute on function public.mz_es_dueno() to anon, authenticated;

-- Lista de permisos válidos (para no guardar cosas raras).
create or replace function public._mz_validar_permisos(p_permisos text[])
returns text[]
language plpgsql
immutable
as $$
declare
  validos text[] := array['pedidos', 'dinero', 'clientes', 'inventario', 'catalogo', 'contenido', 'estadisticas', 'usuarios'];
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

alter table public.perfiles enable row level security;
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.mz_puede('usuarios'));
-- (Nadie escribe directo en perfiles: solo a través de las funciones de abajo.)
revoke insert, update, delete on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;

-- ---------- Mi perfil (lo usan el panel y la app al entrar) ----------
create or replace function public.mz_mi_perfil()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id', u.id,
    'usuario', coalesce(u.raw_user_meta_data ->> 'usuario', split_part(u.email, '@', 1)),
    'rol', coalesce(p.rol, 'personalizado'),
    'permisos', to_jsonb(coalesce(p.permisos, '{}')),
    'activo', coalesce(p.activo, true)
  )
  from auth.users u
  left join public.perfiles p on p.id = u.id
  where u.id = auth.uid();
$$;
revoke all on function public.mz_mi_perfil() from public, anon;
grant execute on function public.mz_mi_perfil() to authenticated;

-- ---------- Funciones de "Usuarios" (reemplazan las de fase_1_18) ----------
drop function if exists public.admin_listar_usuarios();
drop function if exists public.admin_crear_usuario(text, text);

create or replace function public.admin_listar_usuarios()
returns table (
  id uuid, usuario text, rol text, permisos text[], activo boolean,
  creado_en timestamptz, ultimo_ingreso timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.mz_puede('usuarios') then
    raise exception 'No tienes permiso para ver los usuarios.';
  end if;
  return query
    select u.id,
           coalesce(u.raw_user_meta_data ->> 'usuario', split_part(u.email, '@', 1))::text,
           coalesce(p.rol, 'personalizado')::text,
           coalesce(p.permisos, '{}'::text[]),
           coalesce(p.activo, true),
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    left join public.perfiles p on p.id = u.id
    order by u.created_at;
end;
$$;

create or replace function public.admin_crear_usuario(
  p_usuario text,
  p_clave text,
  p_rol text default 'personalizado',
  p_permisos text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_id uuid;
  v_permisos text[] := public._mz_validar_permisos(p_permisos);
begin
  if not public.mz_puede('usuarios') then
    raise exception 'No tienes permiso para crear usuarios.';
  end if;
  if (p_rol = 'dueno' or 'usuarios' = any (v_permisos)) and not public.mz_es_dueno() then
    raise exception 'Solo un dueño puede crear otro dueño o dar el permiso de usuarios.';
  end if;
  if exists (select 1 from auth.users where email = lower(trim(p_usuario)) || '@mueblezulia.app') then
    raise exception 'Ya existe un usuario con ese nombre.';
  end if;
  v_id := public._mz_guardar_usuario(p_usuario, p_clave);
  insert into public.perfiles (id, rol, permisos)
  values (v_id, coalesce(p_rol, 'personalizado'), v_permisos)
  on conflict (id) do update set rol = excluded.rol, permisos = excluded.permisos, activo = true, actualizado_en = now();
  return v_id;
end;
$$;

create or replace function public.admin_guardar_permisos(
  p_id uuid,
  p_rol text,
  p_permisos text[],
  p_activo boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_permisos text[] := public._mz_validar_permisos(p_permisos);
  v_era_dueno boolean;
begin
  if not public.mz_puede('usuarios') then
    raise exception 'No tienes permiso para cambiar permisos.';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes cambiar tus propios permisos (pídeselo a otro dueño).';
  end if;
  if not exists (select 1 from auth.users where id = p_id) then
    raise exception 'Ese usuario no existe.';
  end if;
  select (rol = 'dueno') into v_era_dueno from public.perfiles where id = p_id;
  if (coalesce(v_era_dueno, false) or p_rol = 'dueno' or 'usuarios' = any (v_permisos)) and not public.mz_es_dueno() then
    raise exception 'Solo un dueño puede cambiar a un dueño o dar el permiso de usuarios.';
  end if;
  insert into public.perfiles (id, rol, permisos, activo, actualizado_en)
  values (p_id, p_rol, v_permisos, coalesce(p_activo, true), now())
  on conflict (id) do update
    set rol = excluded.rol, permisos = excluded.permisos, activo = excluded.activo, actualizado_en = now();
  if not exists (select 1 from public.perfiles where rol = 'dueno' and activo) then
    raise exception 'Tiene que quedar al menos un dueño activo.';
  end if;
end;
$$;

create or replace function public.admin_cambiar_clave(p_id uuid, p_clave text)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if p_id <> auth.uid() then
    if not public.mz_puede('usuarios') then
      raise exception 'No tienes permiso para cambiar la contraseña de otra persona.';
    end if;
    if exists (select 1 from public.perfiles where id = p_id and rol = 'dueno') and not public.mz_es_dueno() then
      raise exception 'Solo un dueño puede cambiar la contraseña de un dueño.';
    end if;
  end if;
  if p_clave is null or length(p_clave) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;
  update auth.users set encrypted_password = crypt(p_clave, gen_salt('bf')), updated_at = now() where id = p_id;
end;
$$;

create or replace function public.admin_borrar_usuario(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.mz_puede('usuarios') then
    raise exception 'No tienes permiso para borrar usuarios.';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes borrar tu propio usuario mientras lo estás usando.';
  end if;
  if exists (select 1 from public.perfiles where id = p_id and rol = 'dueno') then
    if not public.mz_es_dueno() then
      raise exception 'Solo un dueño puede borrar a otro dueño.';
    end if;
    if (select count(*) from public.perfiles where rol = 'dueno' and activo and id <> p_id) = 0 then
      raise exception 'Tiene que quedar al menos un dueño activo.';
    end if;
  end if;
  delete from auth.users where id = p_id;
end;
$$;

revoke all on function public.admin_listar_usuarios() from public, anon;
revoke all on function public.admin_crear_usuario(text, text, text, text[]) from public, anon;
revoke all on function public.admin_guardar_permisos(uuid, text, text[], boolean) from public, anon;
revoke all on function public.admin_cambiar_clave(uuid, text) from public, anon;
revoke all on function public.admin_borrar_usuario(uuid) from public, anon;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_crear_usuario(text, text, text, text[]) to authenticated;
grant execute on function public.admin_guardar_permisos(uuid, text, text[], boolean) to authenticated;
grant execute on function public.admin_cambiar_clave(uuid, text) to authenticated;
grant execute on function public.admin_borrar_usuario(uuid) to authenticated;

-- ---------- REGLAS DE CADA TABLA ----------
do $$
declare
  t text;
  pol record;
  catalogo text[] := array[
    'productos', 'categorias', 'producto_imagenes', 'producto_colores', 'producto_etiquetas',
    'etiquetas', 'telas', 'telas_familias'
  ];
  todas text[] := catalogo || array[
    'contenido_sitio', 'testimonios', 'visitas', 'clientes', 'pedidos', 'pedido_items', 'pedido_pagos'
  ];
begin
  -- 1) Borrar las reglas viejas de todas estas tablas (las "temporales",
  --    las de fase_1_17 y las de fase_1_20).
  foreach t in array todas loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
  end loop;

  -- 2) Catálogo: todos lo VEN; solo quien tenga "catalogo" lo cambia.
  foreach t in array catalogo loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('create policy "ver publico" on public.%I for select using (true)', t);
    execute format(
      'create policy "editar catalogo" on public.%I for all to authenticated using (public.mz_puede(''catalogo'')) with check (public.mz_puede(''catalogo''))',
      t
    );
  end loop;

  -- 3) Contenido de la página y opiniones: permiso "contenido".
  if to_regclass('public.contenido_sitio') is not null then
    create policy "ver publico" on public.contenido_sitio for select using (true);
    create policy "editar contenido" on public.contenido_sitio for all to authenticated
      using (public.mz_puede('contenido')) with check (public.mz_puede('contenido'));
  end if;
  if to_regclass('public.testimonios') is not null then
    create policy "ver publico" on public.testimonios for select using (visible or public.mz_puede('contenido'));
    create policy "editar contenido" on public.testimonios for all to authenticated
      using (public.mz_puede('contenido')) with check (public.mz_puede('contenido'));
  end if;

  -- 4) Visitas: cualquiera registra la suya; solo "estadisticas" las lee o borra.
  if to_regclass('public.visitas') is not null then
    create policy "registrar visita" on public.visitas for insert with check (true);
    create policy "leer visitas" on public.visitas for select to authenticated using (public.mz_puede('estadisticas'));
    create policy "borrar visitas" on public.visitas for delete to authenticated using (public.mz_puede('estadisticas'));
  end if;

  -- 5) Negocio (privado: el público NO ve nada de esto).
  if to_regclass('public.clientes') is not null then
    -- Quien hace pedidos puede ver y agregar clientes; editar/borrar la libreta es "clientes".
    create policy "ver clientes" on public.clientes for select to authenticated
      using (public.mz_puede('clientes') or public.mz_puede('pedidos'));
    create policy "agregar clientes" on public.clientes for insert to authenticated
      with check (public.mz_puede('clientes') or public.mz_puede('pedidos'));
    create policy "editar clientes" on public.clientes for update to authenticated
      using (public.mz_puede('clientes')) with check (public.mz_puede('clientes'));
    create policy "borrar clientes" on public.clientes for delete to authenticated
      using (public.mz_puede('clientes'));
    revoke all on public.clientes from anon;
  end if;
  if to_regclass('public.pedidos') is not null then
    create policy "pedidos" on public.pedidos for all to authenticated
      using (public.mz_puede('pedidos')) with check (public.mz_puede('pedidos'));
    revoke all on public.pedidos from anon;
  end if;
  if to_regclass('public.pedido_items') is not null then
    create policy "pedidos" on public.pedido_items for all to authenticated
      using (public.mz_puede('pedidos')) with check (public.mz_puede('pedidos'));
    revoke all on public.pedido_items from anon;
  end if;
  if to_regclass('public.pedido_pagos') is not null then
    create policy "pagos" on public.pedido_pagos for all to authenticated
      using (public.mz_puede('dinero')) with check (public.mz_puede('dinero'));
    revoke all on public.pedido_pagos from anon;
  end if;

  -- 6) Fotos (Storage, carpeta "productos"): ver = público;
  --    subir/cambiar/borrar = quien tenga "catalogo" o "contenido".
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%''productos''%' or coalesce(with_check, '') like '%''productos''%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "fotos productos ver" on storage.objects for select using (bucket_id = 'productos');
create policy "fotos productos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (public.mz_puede('catalogo') or public.mz_puede('contenido')));
create policy "fotos productos cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (public.mz_puede('catalogo') or public.mz_puede('contenido')));
create policy "fotos productos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (public.mz_puede('catalogo') or public.mz_puede('contenido')));

-- Para comprobar (solo muestra, no cambia nada): los usuarios y su rol.
select u.email, p.rol, p.permisos, p.activo
from auth.users u left join public.perfiles p on p.id = u.id
order by u.created_at;
