-- ============================================================
-- FASE 1.6 — Etiquetas especiales de telas
-- Dos "banderas" por producto, además de la lista normal de telas:
-- "Disponible en todas las telas" (el cliente puede pedir cualquier
-- tela del catálogo, no solo las marcadas) y "El color de tu
-- preferencia" (se confecciona en el color/tela que el cliente pida,
-- fuera del catálogo). Se muestran como etiqueta dorada en la
-- tarjeta del catálogo y en el detalle del producto.
-- Ejecuta este bloque una sola vez en el SQL Editor de Supabase.
-- ============================================================

alter table productos
  add column if not exists disponible_todas_telas boolean not null default false;

alter table productos
  add column if not exists color_a_eleccion boolean not null default false;
