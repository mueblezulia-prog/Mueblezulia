import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Selector de telas/colores para un producto — a diferencia de la versión
 * anterior, las telas NO se escriben a mano por producto: se eligen de un
 * catálogo compartido (tabla `telas`, administrado en /admin/telas), así
 * el mismo set de opciones está disponible para cualquier mueble.
 *
 * `seleccionadas`: array de ids de `telas` que aplican a este producto.
 * `onChange(idsSeleccionados)` — el padre guarda esos ids en
 * `producto_colores` (columna `tela_id`) al presionar "Guardar".
 */
export default function SelectorTelas({
  seleccionadas,
  onChange,
  disponibleTodasTelas,
  onCambiarTodasTelas,
  colorAEleccion,
  onCambiarColorEleccion,
  disponibleEntrega,
  onCambiarDisponibleEntrega,
}) {
  const [telas, setTelas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [familiasAbiertas, setFamiliasAbiertas] = useState({});
  const yaInicializado = useRef(false);

  useEffect(() => {
    Promise.all([
      supabase.from("telas").select("*").order("orden"),
      supabase.from("telas_familias").select("*").order("orden"),
    ]).then(([{ data: telasData, error }, { data: familiasData }]) => {
      if (!error && telasData) setTelas(telasData);
      setFamilias(familiasData ?? []);
      setCargando(false);
    });
  }, []);

  // Agrupadas por familia (más fácil de encontrar que una lista suelta) —
  // las que todavía no tienen familia asignada van al final, sin encabezado.
  const gruposPorFamilia = familias
    .map((f) => ({ familia: f, telasDeLaFamilia: telas.filter((t) => t.familia_id === f.id) }))
    .filter((g) => g.telasDeLaFamilia.length > 0);
  const telasSinFamilia = telas.filter((t) => !t.familia_id);

  // Al cargar, abre automáticamente solo las familias que ya tengan algún
  // color marcado para este mueble — así se ve de una vez lo que está
  // elegido, sin tener que adivinar cuál desplegar. El resto arranca
  // cerrada (evita el "pocotón de círculos" cuando hay muchas telas).
  useEffect(() => {
    if (cargando || yaInicializado.current) return;
    yaInicializado.current = true;
    const abiertas = {};
    for (const { familia, telasDeLaFamilia } of gruposPorFamilia) {
      if (telasDeLaFamilia.some((t) => seleccionadas.includes(t.id))) abiertas[familia.id] = true;
    }
    setFamiliasAbiertas(abiertas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  function alternarFamiliaAbierta(familiaId) {
    setFamiliasAbiertas((actual) => ({ ...actual, [familiaId]: !actual[familiaId] }));
  }

  function alternar(id) {
    if (seleccionadas.includes(id)) {
      onChange(seleccionadas.filter((x) => x !== id));
    } else {
      onChange([...seleccionadas, id]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-lg font-bold text-ink flex items-center gap-2">
        <img src="/assets/icons/tela.png" alt="" className="w-5 h-5" />
        Telas disponibles para este mueble
      </span>
      <p className="text-sm text-ink-muted">
        Elige cuáles telas del catálogo puede escoger el cliente para este producto.{" "}
        <a href="/admin/telas" className="text-gold underline">Administrar catálogo de telas →</a>
      </p>

      {cargando && <p className="text-ink-muted text-base">Cargando…</p>}

      {!cargando && telas.length === 0 && (
        <p className="text-ink-muted text-base">
          Todavía no hay telas en el catálogo.{" "}
          <a href="/admin/telas" className="text-gold underline">Crea la primera aquí</a>.
        </p>
      )}

      {!cargando && telas.length > 0 && (
        <div className="flex flex-col gap-2">
          {gruposPorFamilia.map(({ familia, telasDeLaFamilia }) => {
            const abierta = !!familiasAbiertas[familia.id];
            const cantidadElegida = telasDeLaFamilia.filter((t) => seleccionadas.includes(t.id)).length;
            return (
              <div key={familia.id} className="rounded-control border border-carbon-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => alternarFamiliaAbierta(familia.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 min-h-tap text-left"
                >
                  <div className="flex -space-x-2 shrink-0">
                    {telasDeLaFamilia.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className="w-6 h-6 rounded-full border-2 border-carbon shrink-0 bg-cover bg-center"
                        style={t.imagen ? { backgroundImage: `url(${t.imagen})` } : { backgroundColor: t.hex }}
                      />
                    ))}
                  </div>
                  <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink truncate">{familia.nombre}</span>
                    <span className="text-xs text-ink-muted shrink-0">
                      {telasDeLaFamilia.length} color{telasDeLaFamilia.length === 1 ? "" : "es"}
                    </span>
                    {cantidadElegida > 0 && (
                      <span className="text-xs font-bold text-gold shrink-0">✓ {cantidadElegida} elegido{cantidadElegida === 1 ? "" : "s"}</span>
                    )}
                  </span>
                  <span className="text-ink-muted text-lg shrink-0">{abierta ? "▲" : "▼"}</span>
                </button>

                {abierta && (
                  <div className="flex flex-wrap gap-3 px-3 pb-3 pt-1 border-t border-carbon-border">
                    {telasDeLaFamilia.map((tela) => (
                      <BotonTela key={tela.id} tela={tela} activa={seleccionadas.includes(tela.id)} onClick={() => alternar(tela.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {telasSinFamilia.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {telasSinFamilia.map((tela) => (
                <BotonTela key={tela.id} tela={tela} activa={seleccionadas.includes(tela.id)} onClick={() => alternar(tela.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disponibilidad de entrega — decide si en el catálogo se muestra
          la insignia verde "Entrega Inmediata" o "Bajo Pedido". */}
      <div className="flex flex-col gap-2 pt-2 border-t border-carbon-border">
        <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Disponibilidad</span>
        <EtiquetaEspecial
          icono="🚚"
          titulo={disponibleEntrega ? "Entrega inmediata (en stock)" : "Bajo pedido"}
          ayuda={
            disponibleEntrega
              ? "Se muestra la insignia verde de 'Entrega Inmediata' en el catálogo."
              : "Se muestra como 'Bajo Pedido' — actívalo cuando lo tengas listo en tienda."
          }
          activa={disponibleEntrega}
          onClick={() => onCambiarDisponibleEntrega(!disponibleEntrega)}
        />
      </div>

      {/* Etiquetas especiales — no son telas del catálogo, son avisos
          para el cliente. Se muestran como insignia dorada en la tarjeta
          y el detalle del producto cuando están activadas. */}
      <div className="flex flex-col gap-2 pt-2 border-t border-carbon-border">
        <EtiquetaEspecial
          icono="/assets/icons/tela.png"
          titulo="Disponible en todas las telas"
          ayuda="El cliente puede pedir cualquier tela del catálogo, no solo las marcadas arriba."
          activa={disponibleTodasTelas}
          onClick={() => onCambiarTodasTelas(!disponibleTodasTelas)}
        />
        <EtiquetaEspecial
          icono="🎨"
          titulo="El color de tu preferencia"
          ayuda="Se confecciona en el color o tela que pida el cliente, fuera del catálogo."
          activa={colorAEleccion}
          onClick={() => onCambiarColorEleccion(!colorAEleccion)}
        />
      </div>
    </div>
  );
}

function BotonTela({ tela, activa, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={[
        "flex items-center gap-2 rounded-control border-2 px-3 py-2 min-h-tap transition-colors duration-150",
        activa ? "border-gold bg-carbon-light" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
      ].join(" ")}
    >
      <span
        className="w-6 h-6 rounded-full border border-carbon-border shrink-0 bg-cover bg-center"
        style={tela.imagen ? { backgroundImage: `url(${tela.imagen})` } : { backgroundColor: tela.hex }}
      />
      <span className="text-base text-ink">{tela.nombre}</span>
      {activa && <span className="text-gold font-bold">✓</span>}
    </button>
  );
}

function EtiquetaEspecial({ icono, titulo, ayuda, activa, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={[
        "flex items-center gap-3 rounded-control border-2 px-3 py-2 min-h-tap text-left transition-all duration-150",
        activa ? "border-gold bg-gold/10" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
      ].join(" ")}
    >
      <span className="text-xl shrink-0 w-6 h-6 flex items-center justify-center">
        {icono.startsWith("/") ? <img src={icono} alt="" className="w-full h-full object-contain" /> : icono}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-ink">{titulo}</span>
        <span className="block text-xs text-ink-muted">{ayuda}</span>
      </span>
      <span
        className={[
          "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-[11px] font-bold",
          activa ? "border-gold bg-gold text-carbon" : "border-carbon-border text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
    </button>
  );
}
