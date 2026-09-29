-- Fase 1.15: guarda cómo quedó encuadrada la foto de cada categoría, para
-- poder moverla (arrastrarla) en el panel admin y que se vea igual de bien
-- recortada en el sitio para los clientes.
--
-- Cómo usarla: entra a tu proyecto de Supabase → SQL Editor → pega este
-- archivo completo → Run. Es seguro correrlo más de una vez.

alter table categorias
  add column if not exists imagen_pos_x numeric not null default 50;

alter table categorias
  add column if not exists imagen_pos_y numeric not null default 50;
