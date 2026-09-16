import { Link } from "react-router-dom";

export default function Hero() {
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

      <div className="relative px-4 py-14 sm:py-20 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink leading-tight mb-3">
          La Mueblería de la Familia Zuliana
        </h1>
        <p className="text-ink-muted text-lg sm:text-xl mb-8">
          Llevando confort a los hogares del Zulia
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#catalogo"
            className="min-h-tap flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold text-lg"
          >
            Nuestro Catálogo
          </a>
          <Link
            to="/contacto"
            className="min-h-tap flex items-center justify-center px-6 rounded-control border-2 border-ink text-ink font-bold text-lg"
          >
            Contáctanos
          </Link>
        </div>
      </div>
    </div>
  );
}
