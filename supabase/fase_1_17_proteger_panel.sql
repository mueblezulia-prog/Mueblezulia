-- ============================================================
-- Fase 1.17 — Proteger el panel: solo TU usuario puede editar
-- ============================================================
-- Hasta ahora la base de datos dejaba escribir a cualquiera ("escritura
-- temporal"), así que alguien que conociera la dirección /admin podía
-- cambiar o borrar muebles. Después de correr esto:
--   • Cualquier visitante puede VER el catálogo (igual que siempre).
--   • Solo alguien que inició sesión en el panel puede crear, editar,
--     borrar o subir fotos.
--   • Las estadísticas solo las puede ver quien inició sesión.
--
-- ⚠️ ORDEN IMPORTANTE (si lo haces al revés te quedas sin poder editar):
--   1. Crea tu usuario: Supabase → Authentication → Users → "Add user"
--      → "Create new user", pon tu correo y una contraseña, y marca
--      "Auto Confirm User".
--   2. Publica la nueva versión del sitio (el zip) en Railway.
--   3. Entra a /admin, inicia sesión con ese correo y contraseña y
--      comprueba que entras bien.
--   4. Recién ahí, corre este archivo: SQL Editor → pega todo → Run.
--
-- Es seguro correrlo más de una vez.

do $$
declare
  t text;
  pol record;
  tablas text[] := array[
    'productos', 'categorias', 'producto_imagenes', 'producto_colores', 'producto_etiquetas',
    'etiquetas', 'telas', 'telas_familias', 'contenido_sitio', 'testimonios'
  ];
begin
  foreach t in array tablas loop
    -- Solo las tablas que existan en tu proyecto
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Quita TODOS los permisos viejos de esa tabla (incluidos los
    -- "temporales" que dejaban escribir a cualquiera)…
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    -- …y deja solo estos dos:
    execute format('create policy "ver publico" on public.%I for select using (true)', t);
    execute format(
      'create policy "editar solo admin" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;

  -- Opiniones ocultas: el público solo ve las marcadas como visibles.
  if to_regclass('public.testimonios') is not null then
    drop policy if exists "ver publico" on public.testimonios;
    create policy "ver publico" on public.testimonios for select using (visible or auth.role() = 'authenticated');
  end if;

  -- Visitas: cualquiera puede registrar una; solo el admin las lee o borra.
  if to_regclass('public.visitas') is not null then
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'visitas' loop
      execute format('drop policy %I on public.visitas', pol.policyname);
    end loop;
    create policy "registrar visita" on public.visitas for insert with check (true);
    create policy "leer visitas admin" on public.visitas for select to authenticated using (true);
    create policy "borrar visitas admin" on public.visitas for delete to authenticated using (true);
  end if;

  -- Fotos (Storage, carpeta "productos"): ver = público; subir/cambiar/
  -- borrar = solo admin.
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%''productos''%' or coalesce(with_check, '') like '%''productos''%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "fotos productos ver" on storage.objects for select using (bucket_id = 'productos');
create policy "fotos productos subir" on storage.objects for insert to authenticated with check (bucket_id = 'productos');
create policy "fotos productos cambiar" on storage.objects for update to authenticated using (bucket_id = 'productos');
create policy "fotos productos borrar" on storage.objects for delete to authenticated using (bucket_id = 'productos');
