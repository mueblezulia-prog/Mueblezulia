import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import CategoriasGrid from "../components/CategoriasGrid";
import SectionBanner from "../components/SectionBanner";
import BloqueContenido from "../components/BloqueContenido";
import Reveal from "../components/Reveal";
import { obtenerContenido, CONTENIDO_DEFAULT } from "../lib/contenido";
import { sonidoNavegar } from "../lib/sonido";

export default function Home() {
  const [sede, setSede] = useState(CONTENIDO_DEFAULT.nuestra_sede);
  const [fabricacion, setFabricacion] = useState(CONTENIDO_DEFAULT.fabricacion);
  const [bloques, setBloques] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerContenido("nuestra_sede").then((d) => activo && setSede(d));
    obtenerContenido("fabricacion").then((d) => activo && setFabricacion(d));
    obtenerContenido("secciones_home").then((d) => activo && setBloques(d.bloques ?? []));
    return () => {
      activo = false;
    };
  }, []);

  const fotoFabricacion = fabricacion.imagenes?.[0] ?? CONTENIDO_DEFAULT.fabricacion.imagenes[0];

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
            onClick={sonidoNavegar}
            className="min-h-tap inline-flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold
                       hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
          >
            Ver Catálogo Completo
          </Link>
        </div>
      </div>

      {/* NUESTRA SEDE (resumen — la versión completa vive en /contacto) */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border pt-8">
        <div className="mb-5">
          <SectionBanner titulo="Nuestra Sede" icono="📍" imagenFondo={sede.imagen} tinte="dorado" />
        </div>
        <Reveal className="px-4 glass rounded-card overflow-hidden grid sm:grid-cols-2" delay={80}>
          <img
            src={sede.imagen}
            alt="Fachada de Muebles Zulia"
            className="w-full h-56 sm:h-full object-cover"
          />
          <div className="p-5 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-ink mb-2">{sede.titulo}</h3>
            <p className="text-ink-muted mb-2">{sede.texto}</p>
            <p className="text-ink font-semibold mb-4">{sede.direccion}</p>
            <Link
              to="/contacto"
              onClick={sonidoNavegar}
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink/60 text-ink font-bold w-fit
                         hover:bg-ink hover:text-carbon active:scale-[0.98] transition-all duration-200"
            >
              Ver mapa y métodos de pago
            </Link>
          </div>
        </Reveal>
      </section>

      {/* EXCELENCIA EN MANUFACTURA (resumen — versión completa en /fabricacion) */}
      <section className="pb-10 max-w-5xl mx-auto border-t border-carbon-border pt-8">
        <div className="mb-5">
          <SectionBanner titulo="Excelencia en Manufactura" icono="🔨" imagenFondo="/assets/carpinteria.jpg" tinte="oscuro" />
        </div>
        <Reveal className="px-4 glass rounded-card overflow-hidden grid sm:grid-cols-2" delay={80}>
          <img
            src={fotoFabricacion}
            alt="Taller de carpintería de Muebles Zulia"
            className="w-full h-56 sm:h-full object-cover"
          />
          <div className="p-5 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-gold mb-2">{fabricacion.titulo}</h3>
            <p className="text-ink-muted mb-4 line-clamp-3">{fabricacion.texto}</p>
            <Link
              to="/fabricacion"
              onClick={sonidoNavegar}
              className="min-h-tap inline-flex items-center px-5 rounded-control border-2 border-ink/60 text-ink font-bold w-fit
                         hover:bg-ink hover:text-carbon active:scale-[0.98] transition-all duration-200"
            >
              Conocer nuestro proceso
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Secciones libres, armadas y ordenadas desde /admin/contenido */}
      {bloques.map((bloque) => (
        <Reveal key={bloque.id} as="div" className="border-t border-carbon-border">
          <BloqueContenido bloque={bloque} />
        </Reveal>
      ))}
    </div>
  );
}
