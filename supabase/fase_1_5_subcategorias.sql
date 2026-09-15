-- ============================================================
-- FASE 1.5 — Subcategorías dentro de cada categoría
-- Ejemplo real: la categoría "Modulares" puede tener las
-- subcategorías "Grecia", "Verona", "Raquel" (los nombres que tú
-- quieras, se escriben libremente desde /admin/categorias). Cada
-- mueble puede pertenecer a una de esas subcategorías (opcional), y
-- en la página pública de la categoría aparecen como pestañas para
-- filtrar, igual que en la imagen de referencia.
-- Ejecuta este bloque una sola vez en el SQL Editor de Supabase.
-- ============================================================

alter table categorias
  add column if not exists subcategorias jsonb not null default '[]'::jsonb;

alter table productos
  add column if not exists subcategoria text;
