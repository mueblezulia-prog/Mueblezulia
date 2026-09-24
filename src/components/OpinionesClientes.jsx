import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import SectionBanner from "./SectionBanner";
import useModal from "../hooks/useModal";

/**
 * "Lo que dicen nuestros clientes": las opiniones/capturas que el admin
 * sube desde el panel (Opiniones). Se deslizan de lado; tocando una
 * captura se ve en grande. Si todavía no hay opiniones, la sección no
 * aparece (no queda un hueco vacío).
 */
export default function OpinionesClientes() {
  const [opiniones, setOpiniones] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const carruselRef = useRef(null);

  useEffect(() => {
    let activo = true;
    supabase
      .from("testimonios")
      .select("*")
      .eq("visible", true)
      .order("orden")
      .then(({ data, error }) => {
        if (activo && !error) setOpiniones(data ?? []);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (opiniones.length === 0) return null;

  function desplazar(direccion) {
    const el = carruselRef.current;
    if (el) el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="pb-10 max-w-6xl mx-auto border-t border-carbon-border pt-8">
      <div className="mb-5">
        <SectionBanner titulo="Lo que dicen nuestros clientes" icono="/assets/icons/sofa.png" imagenFondo="/assets/interior-tienda.jpg" tinte="dorado" />
      </div>

      <div className="relative">
        <div
          ref={carruselRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-2 scroll-px-4"
        >
          {opiniones.map((op) => (
            <TarjetaOpinion key={op.id} op={op} onAbrir={() => setAbierta(op)} />
          ))}
        </div>

        {opiniones.length > 2 && (
          <>
            <button
              type="button"
              onClick={() => desplazar(-1)}
              aria-label="Anteriores"
              className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-dark text-ink text-2xl items-center justify-center hover:bg-black/60"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => desplazar(1)}
              aria-label="Siguientes"
              className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-dark text-ink text-2xl items-center justify-center hover:bg-black/60"
            >
              ›
            </button>
          </>
        )}
      </div>

      {abierta && <VisorCaptura op={abierta} onCerrar={() => setAbierta(null)} />}
    </section>
  );
}

function Estrellas({ n }) {
  if (!n) return null;
  return (
    <span className="text-gold text-base tracking-wide" aria-label={`${n} de 5 estrellas`}>
      {"★".repeat(n)}
      <span className="text-white/20">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function TarjetaOpinion({ op, onAbrir }) {
  return (
    <article className="snap-start shrink-0 w-[78%] sm:w-72 glass rounded-card overflow-hidden flex flex-col">
      {op.captura && (
        <button
          type="button"
          onClick={onAbrir}
          className="group relative w-full aspect-[4/5] bg-black overflow-hidden"
          aria-label="Ver la captura en grande"
        >
          <img
            src={op.captura}
            alt={`Mensaje de ${op.nombre || "un cliente"}`}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
          <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-2 right-2 glass-dark text-ink text-xs font-bold px-2.5 py-1 rounded-full">🔍 Ver completa</span>
        </button>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <Estrellas n={op.estrellas} />
        {op.texto && <p className="text-ink/90 leading-relaxed">“{op.texto}”</p>}
        <div className="mt-auto pt-1">
          <p className="font-bold text-ink">{op.nombre || "Cliente de Mueble Zulia"}</p>
          {op.producto && <p className="text-sm text-ink-muted">Compró: {op.producto}</p>}
        </div>
      </div>
    </article>
  );
}

function VisorCaptura({ op, onCerrar }) {
  useModal(onCerrar);
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onCerrar} role="dialog" aria-modal="true">
      <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute top-4 right-4 text-3xl text-white/90 min-h-tap min-w-tap">
        ✕
      </button>
      <img
        src={op.captura}
        alt={`Mensaje de ${op.nombre || "un cliente"}`}
        className="max-w-full max-h-full rounded-card object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
