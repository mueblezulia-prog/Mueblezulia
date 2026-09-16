import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sonidoNavegar } from "../lib/sonido";
import { obtenerContenido, CONTENIDO_DEFAULT } from "../lib/contenido";

export default function Hero() {
  const [datos, setDatos] = useState(CONTENIDO_DEFAULT.hero);

  useEffect(() => {
    let activo = true;
    obtenerContenido("hero").then((d) => activo && setDatos(d));
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/assets/fachada.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Overlay oscuro para que el texto blanco siempre se lea bien,
          sin importar qué tan clara sea la foto de fondo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-carbon" />
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-transparent" />

      <div className="relative px-4 py-16 sm:py-24 max-w-4xl mx-auto text-center">
        <span
          className="animar-entrada inline-block text-gold text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-3"
          style={{ animationDelay: "0ms" }}
        >
          {datos.etiqueta}
        </span>
        <h1
          className="animar-entrada text-3xl sm:text-5xl font-extrabold text-ink leading-tight mb-3 drop-shadow-sm"
          style={{ animationDelay: "90ms" }}
        >
          {datos.titulo}
        </h1>
        <p
          className="animar-entrada text-ink-muted text-lg sm:text-xl mb-8"
          style={{ animationDelay: "180ms" }}
        >
          {datos.subtitulo}
        </p>
        <div
          className="animar-entrada flex flex-col sm:flex-row gap-3 justify-center"
          style={{ animationDelay: "270ms" }}
        >
          <Link
            to="/catalogo"
            onClick={sonidoNavegar}
            className="min-h-tap flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold text-lg
                       hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
          >
            Nuestro Catálogo
          </Link>
          <Link
            to="/contacto"
            onClick={sonidoNavegar}
            className="min-h-tap flex items-center justify-center px-6 rounded-control glass text-ink font-bold text-lg
                       hover:bg-white/15 active:scale-[0.98] transition-all duration-200"
          >
            Contáctanos
          </Link>
        </div>
      </div>
    </div>
  );
}
