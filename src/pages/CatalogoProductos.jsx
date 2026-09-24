import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import CategoriasGrid from "../components/CategoriasGrid";
import Reveal from "../components/Reveal";
import FiltroEntregaInmediata from "../components/FiltroEntregaInmediata";
import { EsqueletoTarjetas, MensajeError, MensajeVacio } from "../components/Estados";

/**
 * Catálogo general: muestra TODOS los muebles activos. Para entrar a una
 * línea específica (Modulares, Comedores, etc.) se usa la grilla de arriba,
 * que lleva a su página dedicada /categoria/:slug (CategoriaPagina.jsx) —
 * ahí es donde se filtra por categoría, así el comportamiento es el mismo
 * sin importar desde qué pantalla del sitio se entre.
 */
export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [soloEntrega, setSoloEntrega] = useState(false);
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarProductos() {
      setCargando(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("*, producto_etiquetas(etiquetas(*))")
          .eq("activo", true)
          .order("orden", { ascending: true });

        if (!activo) return;
        if (error) {
          setError(error.message);
        } else {
          setProductos(data ?? []);
        }
      } catch (err) {
        if (!activo) return;
        setError(err?.message ?? "Error desconocido al conectar con la base de datos.");
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarProductos();
    return () => {
      activo = false;
    };
  }, [intento]);

  // Búsqueda sin importar mayúsculas ni acentos ("comedor" encuentra "Comedor").
  const normalizar = (t) => (t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const texto = normalizar(busqueda.trim());
  const filtrados = texto
    ? productos.filter((p) => normalizar(`${p.titulo} ${p.descripcion_corta ?? ""}`).includes(texto))
    : productos;

  return (
    // `isolate`: sin esto, las fotos de fondo (-z-10) quedaban DETRÁS del
    // fondo negro de la app y nunca se veían.
    <div className="relative isolate min-h-screen">
      {/* Fondo de toda la página de Catálogo: la foto de la tienda,
          difuminada y con un velo blanco translúcido encima (efecto
          vidrio "esmerilado"), fija detrás de categorías y productos. */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center blur-md scale-110"
        style={{ backgroundImage: "url(/assets/interior-tienda.jpg)" }}
      />
      <div className="fixed inset-0 -z-10 bg-white/10" />
      <div className="fixed inset-0 -z-10 bg-carbon/70" />

      <div className="relative contenedor py-6">
        <h1 className="text-3xl font-extrabold text-ink mb-1 drop-shadow">Catálogo</h1>
        <p className="text-ink-muted mb-5">Explora todas nuestras líneas de muebles.</p>

        <CategoriasGrid filaEnMovil />

        {/* En el celular el panel va de borde a borde: así cada tarjeta
            gana espacio y nada queda apretado en pantallas chicas. */}
        <div className="relative isolate -mx-4 sm:mx-0 rounded-none sm:rounded-card overflow-hidden border-y sm:border border-white/10 mt-2">
          {/* A diferencia del fondo de la página (una sola foto estirada
              y difuminada), aquí la textura se REPITE en mosaico detrás
              de un panel de vidrio — para que se sienta como una
              superficie, no como una foto de fondo. */}
          <div
            className="absolute inset-0 -z-10"
            style={{ backgroundImage: "url(/assets/textura-vidrio.jpg)", backgroundRepeat: "repeat", backgroundSize: "96px 96px" }}
          />
          <div className="absolute inset-0 -z-10 glass-dark" />

          <div className="relative px-3 sm:px-5 py-5 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink">Todos los productos</h2>
              {!cargando && !error && productos.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* El buscador queda escondido detrás de la lupa: los
                      muebles se ven de una vez al entrar. */}
                  <button
                    type="button"
                    onClick={() => {
                      setBuscadorAbierto((v) => !v);
                      if (buscadorAbierto) setBusqueda("");
                    }}
                    aria-label={buscadorAbierto ? "Cerrar buscador" : "Buscar mueble"}
                    aria-expanded={buscadorAbierto}
                    className={[
                      "w-11 h-11 rounded-full border flex items-center justify-center text-lg transition",
                      buscadorAbierto ? "bg-gold text-carbon border-gold" : "bg-black/35 border-white/15 text-ink hover:border-gold/50",
                    ].join(" ")}
                  >
                    {buscadorAbierto ? "✕" : "🔍"}
                  </button>
                  <FiltroEntregaInmediata activo={soloEntrega} onClick={() => setSoloEntrega((v) => !v)} />
                </div>
              )}
            </div>

            {/* Buscador: escribe "comedor", "cama", "Grecia"… */}
            {!cargando && !error && productos.length > 0 && buscadorAbierto && (
              <div className="relative mb-4 animar-subida">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" aria-hidden="true">
                  🔍
                </span>
                <input
                  autoFocus
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar mueble (ej: comedor, cama…)"
                  aria-label="Buscar mueble"
                  className="w-full min-h-tap pl-11 pr-11 rounded-full bg-black/35 border border-white/15 text-ink text-base placeholder:text-ink-muted
                             focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    aria-label="Borrar búsqueda"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-ink-muted hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {cargando && <EsqueletoTarjetas />}

            {!cargando && error && (
              <MensajeError titulo="No pudimos cargar el catálogo" onReintentar={() => setIntento((n) => n + 1)} />
            )}

            {!cargando && !error && productos.length === 0 && (
              <MensajeVacio>Todavía no hay productos cargados. ¡Vuelve pronto!</MensajeVacio>
            )}

            {!cargando && !error && productos.length > 0 && (
              <>
              {busqueda.trim() && filtrados.length === 0 && (
                <MensajeVacio>No encontramos muebles con "{busqueda.trim()}". Prueba con otra palabra.</MensajeVacio>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {(soloEntrega
                  ? [...filtrados].sort(
                      (a, b) => Number(b.disponible_entrega ?? true) - Number(a.disponible_entrega ?? true)
                    )
                  : filtrados
                ).map((producto, i) => (
                  <Reveal key={producto.id} delay={(i % 8) * 60}>
                    <ProductCard producto={producto} />
                  </Reveal>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
