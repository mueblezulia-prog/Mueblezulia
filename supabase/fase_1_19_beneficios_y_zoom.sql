-- ============================================================
-- Fase 1.19 — Beneficios de las telas + encuadre/zoom de fotos
-- ============================================================
--   • telas_familias.beneficios: etiquetas como "Antifluido",
--     "Pet friendly", "Anti manchas"… que eliges en el panel → Telas.
--   • telas_familias.portada_pos_x / portada_pos_y / portada_zoom: cómo
--     se encuadra la foto de la tela en su tarjeta cuadrada del catálogo.
--   • categorias.imagen_zoom: zoom de la foto de cada categoría.
--
-- Cómo usarla: Supabase → SQL Editor → pega todo → Run.
-- Es seguro correrlo más de una vez.

alter table telas_familias add column if not exists beneficios text[] not null default '{}';
alter table telas_familias add column if not exists portada_pos_x numeric not null default 50;
alter table telas_familias add column if not exists portada_pos_y numeric not null default 50;
alter table telas_familias add column if not exists portada_zoom numeric not null default 1;

alter table categorias add column if not exists imagen_zoom numeric not null default 1;
