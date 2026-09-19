-- ============================================================
-- FASE 1.9 — Foto real de la tela (además del color plano)
-- Cada tela del catálogo (tabla `telas`) ahora puede tener una FOTO de
-- la tela de verdad (una textura, un acercamiento del material), no
-- solo el cuadro de color plano. Si no subes foto, se sigue mostrando
-- el color como hasta ahora — no rompe nada de lo que ya existe.
-- Esto es la base del catálogo de telas; por ahora solo se ve en el
-- panel de administración (/admin/telas) — la parte pública ("Telas"
-- dentro del sitio) es un paso futuro, todavía no.
-- Ejecuta este bloque una sola vez en el SQL Editor de Supabase.
-- ============================================================

alter table telas
  add column if not exists imagen text;
