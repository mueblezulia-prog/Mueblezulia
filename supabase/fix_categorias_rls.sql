-- ============================================================
-- FIX — RLS faltante en "categorias"
-- Explica: (1) por qué no dejaba crear categorías (RLS bloqueaba el
-- INSERT y tiraba el error exacto que viste), (2) por qué las 6
-- categorías por defecto (Modulares, Comedores, etc.) no aparecían
-- en ningún lado del sitio ni del panel admin (RLS bloqueaba el
-- SELECT — sin dar error, simplemente devolvía una lista vacía), y
-- (3) por qué un mueble nuevo quedaba "fuera" del catálogo: el
-- desplegable de categoría en el formulario salía vacío, así que el
-- mueble se guardaba sin categoría asignada.
-- Es seguro correr esto varias veces.
-- ============================================================

alter table categorias enable row level security;

drop policy if exists "categorias: lectura publica" on categorias;
create policy "categorias: lectura publica"
  on categorias for select
  using (true);

-- Mismo esquema temporal de escritura pública que ya usan productos,
-- producto_colores, telas y producto_imagenes (ver nota de seguridad
-- en schema.sql sobre mover esto a server.js más adelante).
drop policy if exists "categorias: escritura temporal anon" on categorias;
create policy "categorias: escritura temporal anon"
  on categorias for all
  using (true)
  with check (true);

-- Verifica que las 6 categorías por defecto queden visibles ahora.
-- Si esta consulta devuelve 0 filas, vuelve a correr el bloque de
-- "insert into categorias" que está en schema.sql (líneas 37-45).
select id, nombre, slug from categorias order by orden;
