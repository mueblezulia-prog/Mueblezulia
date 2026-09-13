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
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-transparent" />

      <div className="relative px-4 py-16 sm:py-24 max-w-4xl mx-auto text-center">
        <span className="inline-block text-gold text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-3">
          Calidad · Tradición · Confort
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink leading-tight mb-3 drop-shadow-sm">
          La Mueblería de la Familia Zuliana
        </h1>
        <p className="text-ink-muted text-lg sm:text-xl mb-8">
          Llevando confort a los hogares del Zulia
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/catalogo"
            className="min-h-tap flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold text-lg
                       hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
          >
            Nuestro Catálogo
          </Link>
          <Link
            to="/contacto"
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
