-- ============================================================
-- Fase 1.18 — Usuarios del panel (sin tener que ir a Supabase)
-- ============================================================
-- Esto hace dos cosas:
--   1. Crea tu primer usuario para entrar al panel:
--        Usuario:    sraikuervalbuena
--        Contraseña: luis1999*
--      (puedes cambiarla después desde el panel → Usuarios).
--   2. Agrega las funciones que usa la nueva página "Usuarios" del panel
--      para crear más usuarios, cambiarles la contraseña o borrarlos.
--
-- Cómo usarla: Supabase → SQL Editor → pega TODO este archivo → Run.
-- Es seguro correrlo más de una vez (si el usuario ya existe, no se
-- duplica; solo se le vuelve a poner esa contraseña).
--
-- Nota técnica: por dentro, Supabase necesita un correo, así que cada
-- usuario se guarda como "<usuario>@mueblezulia.app". Tú solo escribes
-- el nombre de usuario; el panel se encarga del resto.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Crear (o actualizar la contraseña de) un usuario ----------
create or replace function public._mz_guardar_usuario(p_usuario text, p_clave text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_usuario text := lower(trim(p_usuario));
  v_correo text;
  v_id uuid;
begin
  if v_usuario is null or v_usuario !~ '^[a-z0-9._-]{3,40}$' then
    raise exception 'El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo (sin espacios).';
  end if;
  if p_clave is null or length(p_clave) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;
  v_correo := v_usuario || '@mueblezulia.app';

  select id into v_id from auth.users where email = v_correo;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_correo,
      crypt(p_clave, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('usuario', v_usuario),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_correo, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    update auth.users
      set encrypted_password = crypt(p_clave, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = v_id;
  end if;

  return v_id;
end;
$$;

-- Nadie de afuera puede llamar a la función interna directamente.
revoke all on function public._mz_guardar_usuario(text, text) from public, anon, authenticated;

-- ---------- Funciones que usa el panel (solo con sesión iniciada) ----------
create or replace function public.admin_crear_usuario(p_usuario text, p_clave text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión en el panel.';
  end if;
  if exists (select 1 from auth.users where email = lower(trim(p_usuario)) || '@mueblezulia.app') then
    raise exception 'Ya existe un usuario con ese nombre.';
  end if;
  return public._mz_guardar_usuario(p_usuario, p_clave);
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
    raise exception 'Inicia sesión en el panel.';
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
  if auth.uid() is null then
    raise exception 'Inicia sesión en el panel.';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes borrar tu propio usuario mientras lo estás usando.';
  end if;
  if (select count(*) from auth.users) <= 1 then
    raise exception 'Tiene que quedar al menos un usuario.';
  end if;
  delete from auth.users where id = p_id;
end;
$$;

create or replace function public.admin_listar_usuarios()
returns table (id uuid, usuario text, creado_en timestamptz, ultimo_ingreso timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión en el panel.';
  end if;
  return query
    select u.id,
           coalesce(u.raw_user_meta_data->>'usuario', split_part(u.email, '@', 1))::text,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    order by u.created_at;
end;
$$;

revoke all on function public.admin_crear_usuario(text, text) from public, anon;
revoke all on function public.admin_cambiar_clave(uuid, text) from public, anon;
revoke all on function public.admin_borrar_usuario(uuid) from public, anon;
revoke all on function public.admin_listar_usuarios() from public, anon;
grant execute on function public.admin_crear_usuario(text, text) to authenticated;
grant execute on function public.admin_cambiar_clave(uuid, text) to authenticated;
grant execute on function public.admin_borrar_usuario(uuid) to authenticated;
grant execute on function public.admin_listar_usuarios() to authenticated;

-- ---------- Tu primer usuario ----------
select public._mz_guardar_usuario('sraikuervalbuena', 'luis1999*');

-- Para comprobar que quedó creado (solo muestra, no cambia nada):
select email, created_at from auth.users where email = 'sraikuervalbuena@mueblezulia.app';
