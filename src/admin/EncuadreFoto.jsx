import { useRef, useState } from "react";

/**
 * Encuadre de una foto que se muestra recortada (tarjeta de tela,
 * categoría…): arrastra la foto con el dedo o el mouse para elegir qué
 * parte se ve, y usa el zoom (barra o botones − / +) para acercar.
 *
 * Solo guarda 3 números (posición x, y en % y zoom); la foto original
 * nunca se modifica, así siempre se puede volver a encuadrar.
 */
export default function EncuadreFoto({
  url,
  x = 50,
  y = 50,
  zoom = 1,
  onCambiar,
  aspecto = "aspect-square",
  className = "",
  children,
}) {
  const marcoRef = useRef(null);
  const inicioRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  function limitar(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function alPresionar(e) {
    if (!url) return;
    e.preventDefault();
    marcoRef.current?.setPointerCapture?.(e.pointerId);
    inicioRef.current = { px: e.clientX, py: e.clientY, x, y };
    setArrastrando(true);
  }

  function alMover(e) {
    if (!inicioRef.current || !marcoRef.current) return;
    const rect = marcoRef.current.getBoundingClientRect();
    const { px, py, x: x0, y: y0 } = inicioRef.current;
    // Arrastrar a la derecha/abajo mueve la foto hacia allá; con más zoom,
    // el mismo movimiento del dedo desplaza menos (se siente natural).
    const dx = ((e.clientX - px) / rect.width) * 100 / zoom;
    const dy = ((e.clientY - py) / rect.height) * 100 / zoom;
    onCambiar({ x: limitar(x0 - dx, 0, 100), y: limitar(y0 - dy, 0, 100), zoom });
  }

  function alSoltar(e) {
    inicioRef.current = null;
    setArrastrando(false);
    marcoRef.current?.releasePointerCapture?.(e.pointerId);
  }

  function cambiarZoom(nuevo) {
    onCambiar({ x, y, zoom: limitar(Math.round(nuevo * 100) / 100, 1, 3) });
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        ref={marcoRef}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        className={[
          "relative w-full overflow-hidden rounded-control border border-carbon-border bg-carbon select-none touch-none",
          aspecto,
          url ? (arrastrando ? "cursor-grabbing" : "cursor-grab") : "",
        ].join(" ")}
      >
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-ink-muted text-center px-3">Sin foto</div>
        )}
        {url && (
          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-semibold pointer-events-none">
            ✥ Arrastra para mover
          </span>
        )}
        {children}
      </div>

      {url && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cambiarZoom(zoom - 0.1)}
            disabled={zoom <= 1}
            aria-label="Alejar"
            className="w-10 h-10 shrink-0 rounded-control border border-carbon-border text-ink text-xl font-bold disabled:opacity-30 hover:border-gold/50"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 min-w-0 accent-gold h-8"
          />
          <button
            type="button"
            onClick={() => cambiarZoom(zoom + 0.1)}
            disabled={zoom >= 3}
            aria-label="Acercar"
            className="w-10 h-10 shrink-0 rounded-control border border-carbon-border text-ink text-xl font-bold disabled:opacity-30 hover:border-gold/50"
          >
            +
          </button>
          {(x !== 50 || y !== 50 || zoom !== 1) && (
            <button
              type="button"
              onClick={() => onCambiar({ x: 50, y: 50, zoom: 1 })}
              className="h-10 shrink-0 px-2.5 rounded-control text-sm font-semibold text-ink-muted hover:text-ink hover:bg-white/5"
            >
              ↺ Centrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
