import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import VentanaTelaFamilia from "../components/VentanaTelaFamilia";
import { supabase } from "../lib/supabaseClient";

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

  useEffect(() => {
    let activo = true;
    Promise.all([
      supabase.from("telas_familias").select("*").order("orden"),
      supabase.from("telas").select("*").order("orden"),
    ]).then(([{ data: familiasData }, { data: telasData }]) => {
      if (!activo) return;
      setFamilias(familiasData ?? []);
      setTelas(telasData ?? []);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <SectionBanner titulo="Nuestras Telas" icono="/assets/icons/tela.png" imagenFondo="/assets/carpinteria.jpg" tinte="oscuro" />
      </div>

      <div className="px-4 max-w-5xl mx-auto pb-10">
        <p className="text-ink-muted text-base mb-6">
          Estas son las telas y colores con los que fabricamos nuestros muebles. Toca cualquiera para ver todos sus colores, sus
          características y en qué muebles la puedes pedir.
        </p>

        {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}

        {!cargando && familias.length === 0 && (
          <p className="text-ink-muted text-base">Todavía no hay telas cargadas.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {familias.map((familia) => {
            const colores = telas.filter((t) => t.familia_id === familia.id);
            const disponible = familia.disponible ?? true;
            const fotoPortada = familia.foto_completa ?? colores.find((c) => c.imagen)?.imagen ?? null;
            return (
              <button
                key={familia.id}
                type="button"
                onClick={() => setFamiliaAbierta(familia)}
                className="bg-carbon-light border border-carbon-border rounded-card overflow-hidden text-left flex flex-col"
              >
                <div
                  className="w-full aspect-[4/5] bg-cover bg-center bg-carbon-border relative"
                  style={fotoPortada ? { backgroundImage: `url(${fotoPortada})` } : undefined}
                >
                  {!disponible && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-terracota text-white rounded-full px-2 py-0.5 shadow">
                      No disponible
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-ink text-base truncate">{familia.nombre}</div>
                  <div className="text-xs text-ink-muted">
                    {colores.length} color{colores.length === 1 ? "" : "es"}
                  </div>
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
