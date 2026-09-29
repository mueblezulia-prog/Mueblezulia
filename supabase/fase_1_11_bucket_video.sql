-- ============================================================
-- Fase 1.11 — Permitir subir videos al panel de "Contenido del Sitio"
-- ============================================================
-- El bloque nuevo "Video en bucle" sube el archivo al mismo lugar donde
-- ya se guardan las fotos (bucket de Storage "productos"). Si ese bucket
-- tiene una lista de tipos de archivo permitidos (lo normal es que solo
-- tenga fotos: jpg, png, etc.), hay que agregarle los tipos de video;
-- si no tiene ninguna restricción, este script no cambia nada (no hace
-- falta).
--
-- Cómo correrlo: entra a tu proyecto de Supabase → "SQL Editor" → pega
-- todo este archivo → Run. Es seguro correrlo más de una vez.

update storage.buckets
set
  allowed_mime_types = array_cat(
    allowed_mime_types,
    array['video/mp4', 'video/quicktime', 'video/webm']
  ),
  -- Sube el límite por archivo a 25MB si el bucket ya tenía uno más
  -- bajo (para que quepa un video corto de buena calidad). Si el
  -- bucket no tenía límite, se deja sin límite (no se toca).
  file_size_limit = case
    when file_size_limit is not null and file_size_limit < 25 * 1024 * 1024
      then 25 * 1024 * 1024
    else file_size_limit
  end
where id = 'productos'
  -- Solo si el bucket tiene una lista de tipos permitidos (no es null)
  -- y todavía no incluye video/mp4 — así no se corre dos veces de más.
  and allowed_mime_types is not null
  and not (allowed_mime_types @> array['video/mp4']::text[]);

-- Verifica cómo quedó el bucket (esto es solo para que lo veas, no
-- cambia nada):
select id, allowed_mime_types, file_size_limit
from storage.buckets
where id = 'productos';
