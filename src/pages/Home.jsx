import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import CategoriasGrid from "../components/CategoriasGrid";
import SectionBanner from "../components/SectionBanner";
import BloqueContenido from "../components/BloqueContenido";
import FondoMultimedia from "../components/FondoMultimedia";
import Reveal from "../components/Reveal";
import OpinionesClientes from "../components/OpinionesClientes";
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
      <div id="catalogo" className="contenedor py-6 scroll-mt-16">
        <CategoriasGrid />
        <div className="text-center">
          <Link to="/catalogo" onClick={sonidoNavegar} className="btn-gold-glass">
            Ver Catálogo Completo →
          </Link>
        </div>
      </div>

      {/* NUESTRA SEDE (resumen — la versión completa vive en /contacto) */}
      <section className="pb-10 max-w-6xl mx-auto border-t border-carbon-border pt-8">
        <div className="mb-5">
          <SectionBanner titulo="Nuestra Sede" icono="/assets/icons/ubicacion.png" imagenFondo={sede.imagen} tinte="dorado" />
        </div>
        <Reveal className="mx-4 glass border-0 rounded-card overflow-hidden grid sm:grid-cols-2" delay={80}>
          <FondoMultimedia
            imagenes={sede.tipoMedia === "diapositiva" ? sede.imagenes ?? [] : [sede.imagenes?.[0] ?? sede.imagen]}
            video={sede.video}
            tipoMedia={sede.tipoMedia}
            alto="h-56 sm:h-full"
            ajuste={sede.ajusteImagen === "contain" ? "object-contain bg-carbon" : "object-cover"}
            enfoque={sede.enfoque}
            alt="Fachada de Muebles Zulia"
          />
          <div className="p-5 sm:p-8 flex flex-col justify-center">
            <h3 className="text-xl sm:text-2xl font-bold text-ink mb-2">{sede.titulo}</h3>
            <p className="text-ink-muted mb-2">{sede.texto}</p>
            <p className="text-ink font-semibold mb-4">{sede.direccion}</p>
            <Link to="/contacto" onClick={sonidoNavegar} className="btn-outline">
              Ver mapa y métodos de pago
            </Link>
          </div>
        </Reveal>
      </section>

      {/* EXCELENCIA EN MANUFACTURA (resumen — versión completa en /fabricacion) */}
      <section className="pb-10 max-w-6xl mx-auto border-t border-carbon-border pt-8">
        <div className="mb-5">
          <SectionBanner titulo="Excelencia en Manufactura" icono="/assets/icons/fabricacion.png" imagenFondo="/assets/carpinteria.jpg" tinte="oscuro" />
        </div>
        <Reveal className="mx-4 glass border-0 rounded-card overflow-hidden grid sm:grid-cols-2" delay={80}>
          <img
            src={fotoFabricacion}
            alt="Taller de carpintería de Muebles Zulia"
            style={fabricacion.aspecto ? { aspectRatio: fabricacion.aspecto } : undefined}
            className={`w-full object-cover ${fabricacion.aspecto ? "h-auto max-h-72 sm:max-h-full" : "h-56 sm:h-full"}`}
          />
          <div className="relative overflow-hidden flex flex-col justify-center">
            {/* Efecto espejo: la misma foto del taller, duplicada y
                difuminada de fondo — así este lado nunca se ve como un
                cuadro gris plano, aunque sea su propio bloque separado. */}
            {fotoFabricacion && (
              <div
                className="absolute inset-0 bg-cover bg-center scale-125 blur-xl opacity-60"
                style={{ backgroundImage: `url(${fotoFabricacion})` }}
                aria-hidden="true"
              />
            )}
            <div className="relative p-5 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-ink mb-2 drop-shadow-sm">{fabricacion.titulo}</h3>
              <p className="text-ink-muted mb-4 line-clamp-3 drop-shadow-sm">{fabricacion.texto}</p>
              <Link to="/fabricacion" onClick={sonidoNavegar} className="btn-outline">
                Conocer nuestro proceso
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Opiniones de clientes (se cargan desde el panel → Opiniones) */}
      <OpinionesClientes />

      {/* Secciones libres, armadas y ordenadas desde /admin/contenido */}
      {bloques.map((bloque) => (
        <Reveal key={bloque.id} as="div" className="border-t border-carbon-border">
          <BloqueContenido bloque={bloque} />
        </Reveal>
      ))}
    </div>
  );
}
