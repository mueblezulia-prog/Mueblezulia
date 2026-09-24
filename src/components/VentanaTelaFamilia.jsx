import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { formatearPrecio } from "../lib/formato";
import useModal from "../hooks/useModal";

const MAX_VISIBLES = 4;

/**
 * Igual que <TelaRealDetalle>, pero SIN estar atada a un producto —
 * se abre directamente desde el catálogo de telas (/telas) al tocar una
 * familia. Muestra: si está disponible, la foto completa, características,
 * todos sus colores, y los muebles que la usan (de cualquier color de la
 * familia, o de un color específico si se elige uno).
 */
export default function VentanaTelaFamilia({ familia, colores, onCerrar }) {
  const [colorSeleccionado, setColorSeleccionado] = useState(colores[0] ?? null);
  const [modoFamilia, setModoFamilia] = useState(colores.length <= 1);
  const [relacionados, setRelacionados] = useState([]);
  const [verTodos, setVerTodos] = useState(false);
  const [fotoCompletaAbierta, setFotoCompletaAbierta] = useState(false);
  const [cargandoRel, setCargandoRel] = useState(true);

  // Escape cierra (primero la foto completa si está abierta) y el fondo
  // no se desplaza mientras la ventana está abierta.
  useModal(() => (fotoCompletaAbierta ? setFotoCompletaAbierta(false) : onCerrar()));

  const disponible = familia.disponible ?? true;
  const propiedades = [
    familia.composicion && { icono: "🧵", texto: familia.composicion },
    familia.ancho && { icono: "📏", texto: `Ancho: ${familia.ancho}` },
    familia.cuidados && { icono: "🧺", texto: familia.cuidados },
  ].filter(Boolean);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const idsFiltro = modoFamilia || !colorSeleccionado ? colores.map((c) => c.id) : [colorSeleccionado.id];
      if (idsFiltro.length === 0) {
        setRelacionados([]);
        setCargandoRel(false);
        return;
      }
      setCargandoRel(true);
      const { data } = await supabase
        .from("productos")
        .select("id, titulo, precio, imagen_recortada_url")
        .in("tela_color_id", idsFiltro)
        .eq("activo", true)
        .order("orden");
      if (activo) {
        setRelacionados(data ?? []);
        setCargandoRel(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoFamilia, colorSeleccionado]);

  const visibles = verTodos ? relacionados : relacionados.slice(0, MAX_VISIBLES);

  return createPortal(
    <>
      {/* En móvil se ve como una hoja que sube desde abajo, de borde a
          borde (como siempre). En pantallas más anchas (sm: en adelante,
          computador) se centra como una ventana normal, con un ancho
          máximo — así no se estira de pared a pared ni se ve raro. */}
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/55 sm:p-4"
        onClick={onCerrar}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tela ${familia.nombre}`}
          className="bg-carbon border border-white/10 rounded-t-3xl sm:rounded-3xl px-5 pt-2.5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:pb-7 max-h-[88vh] sm:max-h-[85vh] w-full sm:max-w-lg
                     overflow-y-auto overscroll-contain flex flex-col gap-4 [&>*]:shrink-0 shadow-2xl shadow-black/50 animar-subida"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-9 h-1 rounded-full bg-carbon-border mx-auto sm:hidden" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-ink-muted uppercase tracking-wide">Familia de tela</div>
              <div className="text-lg font-extrabold text-ink mt-0.5">{familia.nombre}</div>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-2xl text-ink-muted hover:text-ink min-h-tap min-w-tap rounded-full hover:bg-white/5 transition">
              ✕
            </button>
          </div>

          {!disponible && (
            <p className="text-sm font-semibold text-terracota bg-terracota/10 border border-terracota/30 rounded-control px-3 py-2">
              Esta tela no está disponible por el momento.
            </p>
          )}

          {familia.foto_completa && (
            // Vista previa de la foto REAL de la tela, completa (sin
            // recortar ni hacer zoom) — tócala para verla en grande.
            <button
              type="button"
              onClick={() => setFotoCompletaAbierta(true)}
              className="group relative rounded-card overflow-hidden border border-white/10 bg-carbon-light"
            >
              <div
                className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-40"
                style={{ backgroundImage: `url(${familia.foto_completa})` }}
                aria-hidden="true"
              />
              <img
                src={familia.foto_completa}
                alt={`Tela ${familia.nombre}`}
                className="relative mx-auto max-h-64 w-auto object-contain"
              />
              <span className="absolute bottom-2 right-2 glass-dark text-ink text-xs font-bold px-2.5 py-1 rounded-full group-hover:bg-black/60 transition">
                🔍 Ver tela completa
              </span>
            </button>
          )}

          {familia.descripcion && <p className="text-sm text-ink-muted leading-relaxed">{familia.descripcion}</p>}

          {propiedades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {propiedades.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold/15 border border-gold/40 rounded-control px-2.5 py-1"
                >
                  <span>{p.icono}</span>
                  <span>{p.texto}</span>
                </span>
              ))}
            </div>
          )}

          {colores.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wide">Colores de esta tela</span>
              <div className="flex flex-wrap gap-2">
                {colores.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setColorSeleccionado(c);
                      setModoFamilia(false);
                    }}
                    className={[
                      "flex items-center gap-2 rounded-full border-2 pl-1.5 pr-3 py-1.5 min-h-tap",
                      colorSeleccionado?.id === c.id && !modoFamilia ? "border-gold bg-carbon-light" : "border-carbon-border",
                    ].join(" ")}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white/15 bg-cover bg-center"
                      style={c.imagen ? { backgroundImage: `url(${c.imagen})` } : { backgroundColor: c.hex }}
                    />
                    <span className="text-sm font-semibold text-ink">{c.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {colores.length > 1 && (
            <div className="flex bg-carbon-light border border-carbon-border rounded-control p-1">
              <button
                type="button"
                onClick={() => setModoFamilia(false)}
                className={["flex-1 text-center py-2 rounded-control text-sm font-bold", !modoFamilia ? "bg-gold text-carbon" : "text-ink-muted"].join(" ")}
              >
                Solo {colorSeleccionado?.nombre ?? "un color"}
              </button>
              <button
                type="button"
                onClick={() => setModoFamilia(true)}
                className={["flex-1 text-center py-2 rounded-control text-sm font-bold", modoFamilia ? "bg-gold text-carbon" : "text-ink-muted"].join(" ")}
              >
                Toda la familia
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              Muebles con esta tela {relacionados.length > 0 ? `(${relacionados.length})` : ""}
            </span>

            {cargandoRel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="esqueleto aspect-[4/5]" />
                <div className="esqueleto aspect-[4/5]" />
              </div>
            )}

            {!cargandoRel && relacionados.length === 0 && (
              <p className="text-sm text-ink-muted">Todavía no hay muebles con esta tela.</p>
            )}

            {!cargandoRel && relacionados.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {visibles.map((p) => (
                  <Link
                    key={p.id}
                    to={`/producto/${p.id}`}
                    onClick={onCerrar}
                    className="group bg-carbon-light border border-carbon-border rounded-control overflow-hidden hover:border-gold/50 transition-colors"
                  >
                    <div
                      className="w-full aspect-[4/5] bg-cover bg-center bg-carbon-border"
                      style={p.imagen_recortada_url ? { backgroundImage: `url(${p.imagen_recortada_url})` } : undefined}
                    />
                    <div className="px-2.5 py-2">
                      <div className="text-sm font-bold text-ink truncate">{p.titulo}</div>
                      <div className="text-sm text-gold font-bold">{formatearPrecio(p.precio)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!cargandoRel && relacionados.length > MAX_VISIBLES && !verTodos && (
              <button
                type="button"
                onClick={() => setVerTodos(true)}
                className="min-h-tap rounded-control border-2 border-carbon-border text-gold font-bold text-sm mt-1"
              >
                Ver los {relacionados.length} muebles →
              </button>
            )}
          </div>
        </div>
      </div>

      {fotoCompletaAbierta && familia.foto_completa && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setFotoCompletaAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setFotoCompletaAbierta(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-3xl text-white/90 min-h-tap min-w-tap"
          >
            ✕
          </button>
          <img
            src={familia.foto_completa}
            alt={`Tela completa — ${familia.nombre}`}
            className="max-w-full max-h-full rounded-card object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>,
    document.body
  );
}
