-- Fase 1.14: propiedades principales de la tela (composición, ancho,
-- cuidados) para mostrarlas como insignias en la tarjeta pública de /telas
-- y en la ventana de detalle, igual que las insignias de los muebles.
--
-- Cómo usarla: entra a tu proyecto de Supabase → SQL Editor → pega este
-- archivo completo → Run. Es seguro correrlo más de una vez.

alter table telas_familias
  add column if not exists composicion text;

alter table telas_familias
  add column if not exists ancho text;

alter table telas_familias
  add column if not exists cuidados text;
