import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Hero from "../components/Hero";
import CategoriasGrid from "../components/CategoriasGrid";
import { obtenerContenido } from "../lib/contenido";
import BloqueContenido from "../components/BloqueContenido";

export default function Home() {
  const navigate = useNavigate();
  const [bloquesExtra, setBloquesExtra] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerContenido("secciones_home").then((c) => {
      if (activo) setBloquesExtra(c.bloques ?? []);
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      <Hero />

      {/* Vitrina de categorías: aquí solo se navega al catálogo dedicado,
          no se filtra en la misma página. */}
      <div id="catalogo" className="px-4 py-6 max-w-6xl mx-auto scroll-mt-16">
        <CategoriasGrid
          onCategoriaClick={(cat) => navigate(`/categoria/${cat.id}`)}
        />
        <div className="text-center">
          <Link
            to="/catalogo"
            className="min-h-tap inline-flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold"
          >
            Ver Catálogo Completo
          </Link>
        </div>
      </div>

      {/* NUESTRA SEDE (resumen — la versión completa vive en /contacto) */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border">
        <div className="bg-gold py-3 mb-6">
          <h2 className="text-center text-carbon font-extrabold text-xl uppercase tracking-wide">
            Nuestra Sede
          </h2>
        </div>
        <div className="px-4 grid sm:grid-cols-2 gap-4 items-center">
          <img
            src="/assets/ubicacion.jpg"
            alt="Fachada de Muebles Zulia"
            className="w-full h-56 sm:h-72 object-cover rounded-card border border-carbon-border"
          />
          <div>
            <h3 className="text-xl font-bold text-ink mb-2">¡Te esperamos en Muebles Zulia! 📍</h3>
            <p className="text-ink-muted mb-2">
              Ven a conocer la calidad y el diseño que cambiarán tu hogar.
            </p>
            <p className="text-ink font-semibold mb-4">Av. 15 Delicias, frente a Alkosto.</p>
            <Link
              to="/contacto"
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink text-ink font-bold"
            >
              Ver mapa y métodos de pago
            </Link>
          </div>
        </div>
      </section>

      {/* EXCELENCIA EN MANUFACTURA (resumen — versión completa en /fabricacion) */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border">
        <div className="bg-ink py-3 mb-6">
          <h2 className="text-center text-carbon font-extrabold text-xl uppercase tracking-wide">
            Excelencia en Manufactura
          </h2>
        </div>
        <div className="px-4 grid sm:grid-cols-2 gap-4 items-center">
          <img
            src="/assets/taller.jpg"
            alt="Artesano trabajando en el taller de Muebles Zulia"
            className="w-full h-56 sm:h-72 object-cover rounded-card border border-carbon-border"
          />
          <div>
            <h3 className="text-xl font-bold text-gold mb-2">Pasión por el Detalle</h3>
            <p className="text-ink-muted mb-4">
              En Muebles Zulia, la excelencia no es negociable. Supervisamos
              cada etapa de la confección para lograr acabados impecables.
            </p>
            <Link
              to="/fabricacion"
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink text-ink font-bold"
            >
              Conocer nuestro proceso
            </Link>
          </div>
        </div>
      </section>

      {/* Secciones extra armadas desde /admin/contenido */}
      {bloquesExtra.map((bloque) => (
        <BloqueContenido key={bloque.id} bloque={bloque} />
      ))}
    </div>
  );
}
