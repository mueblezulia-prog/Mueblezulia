import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import VentanaTelaFamilia from "../components/VentanaTelaFamilia";
import { supabase } from "../lib/supabaseClient";
import { EsqueletoTarjetas, MensajeError, MensajeVacio } from "../components/Estados";

/**
 * Catálogo público de telas: todas las familias de tela (con sus colores)
 * en tarjetas, para que el cliente las vea SIN tener que entrar primero a
 * un mueble. Al tocar una, se abre la misma ventana de detalle que se usa
 * en la ficha de un producto (ver <VentanaTelaFamilia>), con la foto
 * completa, características, todos los colores y los muebles que la usan.
 */
export default function Telas() {
  const [familias, setFamilias] = useState([]);
  const [telas, setTelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [familiaAbierta, setFamiliaAbierta] = useState(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(false);
    Promise.all([
      supabase.from("telas_familias").select("*").order("orden"),
      supabase.from("telas").select("*").order("orden"),
    ])
      .then(([{ data: familiasData, error: e1 }, { data: telasData, error: e2 }]) => {
        if (!activo) return;
        if (e1 || e2) {
          setError(true);
        } else {
          // Solo se muestran familias que tengan al menos un color cargado
          // (una familia recién creada y vacía no le sirve al cliente).
          const conColores = (familiasData ?? []).filter((f) => (telasData ?? []).some((t) => t.familia_id === f.id));
          setFamilias(conColores);
          setTelas(telasData ?? []);
        }
      })
      .catch(() => activo && setError(true))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [intento]);

  return (
    <div>
      <div className="mb-8">
        <SectionBanner titulo="Nuestras Telas" icono="/assets/icons/tela.png" imagenFondo="/assets/carpinteria.jpg" tinte="oscuro" />
      </div>

      <div className="contenedor pb-10">
        <p className="text-ink-muted text-base mb-6 max-w-3xl">
          Estas son las telas y colores con los que fabricamos nuestros muebles. Toca cualquiera para ver todos sus colores, sus
          características y en qué muebles la puedes pedir.
        </p>

        {cargando && <EsqueletoTarjetas cantidad={4} />}

        {!cargando && error && <MensajeError titulo="No pudimos cargar las telas" onReintentar={() => setIntento((n) => n + 1)} />}

        {!cargando && !error && familias.length === 0 && <MensajeVacio>Todavía no hay telas cargadas.</MensajeVacio>}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 items-start">
          {familias.map((familia) => {
            const colores = telas.filter((t) => t.familia_id === familia.id);
            const disponible = familia.disponible ?? true;
            // Preferimos siempre la foto completa de la tira (la foto real
            // de la tela, con todos sus colores) — solo si una familia
            // vieja no la tiene, se usa el swatch redondo del primer color
            // como respaldo.
            const fotoPortada = familia.foto_completa ?? colores.find((c) => c.imagen)?.imagen ?? null;
            const propiedades = [
              familia.composicion && { icono: "🧵", texto: familia.composicion },
              familia.ancho && { icono: "📏", texto: familia.ancho },
              familia.cuidados && { icono: "🧺", texto: familia.cuidados },
            ].filter(Boolean);

            return (
              <button
                key={familia.id}
                type="button"
                onClick={() => setFamiliaAbierta(familia)}
                className="glass hover:border-gold/50 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5
                           transition-all duration-300 ease-out rounded-card overflow-hidden text-left flex flex-col"
              >
                <div className="relative w-full overflow-hidden bg-carbon">
                  {fotoPortada ? (
                    // Sin recortar ni forzar un cuadro fijo: la imagen se
                    // muestra completa, con SU propia forma (alta, ancha,
                    // cuadrada — la que tenga la foto real) — cada tarjeta
                    // puede quedar con una altura distinta, y eso está bien.
                    <img src={fotoPortada} alt={familia.nombre} className="w-full h-auto block" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-[4/5] flex items-center justify-center text-ink-muted text-xs text-center px-2">
                      Sin foto todavía
                    </div>
                  )}
                  {!disponible && (
                    <span className="absolute top-2 left-2 text-xs font-bold uppercase tracking-wide bg-terracota text-white rounded-full px-2 py-0.5 shadow">
                      No disponible
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white/[0.03] backdrop-blur-sm border-t border-white/10 flex flex-col gap-1">
                  <div className="font-bold text-ink text-base sm:text-lg truncate">{familia.nombre}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {colores.slice(0, 5).map((c) => (
                        <span
                          key={c.id}
                          className="w-4 h-4 rounded-full border border-carbon bg-cover bg-center"
                          style={c.imagen ? { backgroundImage: `url(${c.imagen})` } : { backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-ink-muted">
                      {colores.length} color{colores.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  {propiedades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {propiedades.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 max-w-full min-w-0 text-xs font-semibold text-gold bg-gold/15 border border-gold/40 rounded-control px-1.5 py-0.5"
                        >
                          <span>{p.icono}</span>
                          <span className="truncate">{p.texto}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {familiaAbierta && (
        <VentanaTelaFamilia
          familia={familiaAbierta}
          colores={telas.filter((t) => t.familia_id === familiaAbierta.id)}
          onCerrar={() => setFamiliaAbierta(null)}
        />
      )}
    </div>
  );
}
