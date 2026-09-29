-- ============================================================
-- Fase 1.12 — Permitir fotos en formato WebP (para que pesen menos)
-- ============================================================
-- Ahora, al subir cualquier foto desde el panel admin (contenido,
-- categorías, productos, etiquetas, telas), el sitio la convierte sola a
-- formato WebP antes de guardarla — se ve prácticamente igual pero pesa
-- bastante menos, así el sitio carga más rápido y se ahorra espacio de
-- almacenamiento. Si el bucket "productos" tiene una lista de tipos de
-- archivo permitidos, hay que agregarle "image/webp"; si no tiene
-- ninguna restricción, este script no cambia nada (no hace falta).
--
-- Cómo correrlo: entra a tu proyecto de Supabase → "SQL Editor" → pega
-- todo este archivo → Run. Es seguro correrlo más de una vez.

update storage.buckets
set allowed_mime_types = array_cat(allowed_mime_types, array['image/webp'])
where id = 'productos'
  -- Solo si el bucket tiene una lista de tipos permitidos (no es null)
  -- y todavía no incluye image/webp — así no se corre dos veces de más.
  and allowed_mime_types is not null
  and not (allowed_mime_types @> array['image/webp']::text[]);

-- Verifica cómo quedó el bucket (esto es solo para que lo veas, no
-- cambia nada):
select id, allowed_mime_types, file_size_limit
from storage.buckets
where id = 'productos';
