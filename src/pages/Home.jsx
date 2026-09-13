import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import CategoriasGrid from "../components/CategoriasGrid";

export default function Home() {
  return (
    <div>
      <Hero />

      {/* Vitrina de categorías: cada tarjeta lleva directo a su página
          dedicada /categoria/:slug (ver CategoriasGrid). */}
      <div id="catalogo" className="px-4 py-6 max-w-6xl mx-auto scroll-mt-16">
        <CategoriasGrid />
        <div className="text-center">
          <Link
            to="/catalogo"
            className="min-h-tap inline-flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold
                       hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
          >
            Ver Catálogo Completo
          </Link>
        </div>
      </div>

      {/* NUESTRA SEDE (resumen — la versión completa vive en /contacto).
          Tarjeta única con efecto vidrio: la foto y el texto viven en un
          mismo panel translúcido, con el título flotando como pill dorado. */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border pt-8 px-4">
        <div className="flex justify-center mb-5">
          <h2 className="glass-gold text-ink font-extrabold text-lg uppercase tracking-wide px-5 py-2 rounded-control">
            Nuestra Sede
          </h2>
        </div>
        <div className="glass rounded-card overflow-hidden grid sm:grid-cols-2">
          <img
            src="/assets/ubicacion.jpg"
            alt="Fachada de Muebles Zulia"
            className="w-full h-56 sm:h-full object-cover"
          />
          <div className="p-5 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-ink mb-2">¡Te esperamos en Muebles Zulia! 📍</h3>
            <p className="text-ink-muted mb-2">
              Ven a conocer la calidad y el diseño que cambiarán tu hogar.
            </p>
            <p className="text-ink font-semibold mb-4">Av. 15 Delicias, frente a Alkosto.</p>
            <Link
              to="/contacto"
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink/60 text-ink font-bold w-fit
                         hover:bg-ink hover:text-carbon active:scale-[0.98] transition-all duration-200"
            >
              Ver mapa y métodos de pago
            </Link>
          </div>
        </div>
      </section>

      {/* EXCELENCIA EN MANUFACTURA (resumen — versión completa en /fabricacion) */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border pt-8 px-4">
        <div className="flex justify-center mb-5">
          <h2 className="glass text-ink font-extrabold text-lg uppercase tracking-wide px-5 py-2 rounded-control">
            Excelencia en Manufactura
          </h2>
        </div>
        <div className="glass rounded-card overflow-hidden grid sm:grid-cols-2">
          <img
            src="/assets/taller.jpg"
            alt="Artesano trabajando en el taller de Muebles Zulia"
            className="w-full h-56 sm:h-full object-cover"
          />
          <div className="p-5 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-gold mb-2">Pasión por el Detalle</h3>
            <p className="text-ink-muted mb-4">
              En Muebles Zulia, la excelencia no es negociable. Supervisamos
              cada etapa de la confección para lograr acabados impecables.
            </p>
            <Link
              to="/fabricacion"
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink/60 text-ink font-bold w-fit
                         hover:bg-ink hover:text-carbon active:scale-[0.98] transition-all duration-200"
            >
              Conocer nuestro proceso
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
