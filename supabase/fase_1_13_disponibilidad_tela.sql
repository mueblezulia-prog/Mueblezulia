-- Fase 1.13 — Disponibilidad de una familia de tela + foto completa de la
-- tira (para el botón "Ver tela completa" en la ventana del cliente).
--
-- No se toca ningún dato existente. Todas las familias que ya tienen se
-- marcan disponibles por defecto (true) — no cambia nada de lo que se ve
-- hasta que alguien la marque como "No disponible" desde /admin/telas.
--
-- Idempotente: se puede correr más de una vez sin error.

alter table telas_familias
  add column if not exists disponible boolean not null default true;

alter table telas_familias
  add column if not exists foto_completa text;
