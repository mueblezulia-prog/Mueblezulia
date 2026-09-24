-- ============================================================
-- Fase 1.16 — Opiniones de clientes + Estadísticas de visitas
-- ============================================================
-- Crea dos tablas nuevas:
--   • testimonios: las opiniones/capturas de clientes que subes desde
--     el panel ("Opiniones") y que se muestran en la página de Inicio.
--   • visitas: cada vez que alguien abre una página del sitio o toca el
--     botón de WhatsApp, se guarda una fila (sin datos personales: nada
--     de nombres ni direcciones IP) para la página "Estadísticas".
--
-- Cómo usarla: Supabase → SQL Editor → pega todo este archivo → Run.
-- Es seguro correrlo más de una vez. Córrelo ANTES de fase_1_17.

create extension if not exists pgcrypto;

-- ---------- OPINIONES ----------
create table if not exists testimonios (
  id uuid primary key default gen_random_uuid(),
  nombre text,                 -- nombre del cliente (opcional)
  texto text,                  -- lo que dijo (opcional si hay captura)
  captura text,                -- foto/captura de pantalla (opcional)
  estrellas int check (estrellas between 1 and 5),
  producto text,               -- qué compró (opcional, ej. "Modular Grecia")
  visible boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);
alter table testimonios enable row level security;

-- ---------- VISITAS ----------
create table if not exists visitas (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  tipo text not null default 'vista',   -- 'vista' (abrió una página) | 'whatsapp' (tocó el botón)
  ruta text,                            -- ej. /producto/123
  producto_id text,                     -- si fue un mueble
  visitante text,                       -- número al azar guardado en el navegador (para contar personas distintas)
  origen text,                          -- WhatsApp, Instagram, Google, Directo…
  dispositivo text,                     -- Celular | Computador | Tablet
  pais text,
  region text,
  ciudad text
);
create index if not exists visitas_creado_en_idx on visitas (creado_en desc);
alter table visitas enable row level security;

-- Permisos provisionales (mientras no corras fase_1_17): cualquiera
-- puede registrar una visita, y se puede leer para ver las estadísticas.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'visitas' and policyname = 'registrar visita') then
    create policy "registrar visita" on visitas for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'visitas' and policyname = 'leer visitas temporal') then
    create policy "leer visitas temporal" on visitas for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'testimonios' and policyname = 'lectura publica testimonios') then
    create policy "lectura publica testimonios" on testimonios for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'testimonios' and policyname = 'escritura temporal testimonios') then
    create policy "escritura temporal testimonios" on testimonios for all using (true) with check (true);
  end if;
end $$;
