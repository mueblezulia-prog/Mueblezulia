import { useEffect, useRef, useState } from "react";

/**
 * Una foto que se ve completa dentro de su recuadro (como object-contain)
 * con puntos encima, ubicados en % de la foto. Los puntos quedan en el
 * mismo lugar del mueble aunque cambie el tamaño de la pantalla.
 *
 * puntos: [{ id, x, y, etiqueta }]   (x, y de 0 a 100)
 * onTocarFoto(x, y): opcional, para poner un punto nuevo (editor).
 */
export default function ImagenConPuntos({ src, alt = "", puntos = [], activo = null, onTocarPunto, onTocarFoto, className = "", imgClassName = "", loading }) {
  const caja = useRef(null);
  const [natural, setNatural] = useState(null);
  const [rect, setRect] = useState(null);
  const foto = useRef(null);

  // Si la foto ya estaba cargada (en caché) antes de que React escuche
  // "onLoad", se mide igual aquí.
  useEffect(() => {
    const img = foto.current;
    if (img && img.complete && img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight || 1 });
    else setNatural(null);
  }, [src]);

  useEffect(() => {
    const el = caja.current;
    if (!el || !natural) return undefined;
    const medir = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const escala = Math.min(W / natural.w, H / natural.h);
      const w = natural.w * escala;
      const h = natural.h * escala;
      setRect({ left: (W - w) / 2, top: (H - h) / 2, width: w, height: h });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [natural]);

  function tocar(e) {
    if (!onTocarFoto || !rect) return;
    const r = caja.current.getBoundingClientRect();
    const x = ((e.clientX - r.left - rect.left) / rect.width) * 100;
    const y = ((e.clientY - r.top - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onTocarFoto(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  return (
    <div ref={caja} className={`relative w-full h-full ${onTocarFoto ? "cursor-crosshair" : ""} ${className}`} onClick={tocar}>
      <img
        ref={foto}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
        className={`relative w-full h-full object-contain select-none ${imgClassName}`}
        draggable={false}
      />
      {rect &&
        puntos.map((p, i) => (
          <button
            key={p.id ?? i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTocarPunto?.(p);
            }}
            aria-label={p.etiqueta ?? `Mueble ${i + 1}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center"
            style={{ left: rect.left + (rect.width * p.x) / 100, top: rect.top + (rect.height * p.y) / 100 }}
          >
            <span className={`absolute inset-1.5 rounded-full bg-gold/40 ${activo === p.id ? "" : "animate-ping"}`} aria-hidden="true" />
            <span
              className={`relative w-7 h-7 rounded-full border-2 border-white shadow-lg shadow-black/50 flex items-center justify-center text-xs font-extrabold ${
                activo === p.id ? "bg-white text-carbon" : "bg-gold text-carbon"
              }`}
            >
              {p.numero ?? "+"}
            </span>
          </button>
        ))}
    </div>
  );
}
