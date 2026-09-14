import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import { obtenerContenido, CONTENIDO_DEFAULT } from "../lib/contenido";

export default function Fabricacion() {
  const [datos, setDatos] = useState(CONTENIDO_DEFAULT.fabricacion);

  useEffect(() => {
    let activo = true;
    obtenerContenido("fabricacion").then((d) => activo && setDatos(d));
    return () => {
      activo = false;
    };
  }, []);

  const imagenes = datos.imagenes?.length ? datos.imagenes : CONTENIDO_DEFAULT.fabricacion.imagenes;

  return (
    <div>
      <div className="mb-8">
        <SectionBanner
          titulo="Excelencia en Manufactura"
          icono="🔨"
          imagenFondo="/assets/carpinteria.jpg"
          tinte="oscuro"
        />
      </div>

      <section className="px-4 pb-10 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-72 sm:h-96">
            {imagenes.slice(0, 4).map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt="Trabajo artesanal en el taller de Muebles Zulia"
                className="w-full h-full object-cover rounded-card border border-carbon-border"
              />
            ))}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gold mb-3">
              {datos.titulo}
            </h2>
            <p className="text-ink-muted text-lg leading-relaxed whitespace-pre-line">
              {datos.texto}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
