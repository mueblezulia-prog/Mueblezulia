import { useParams, Link } from "react-router-dom";

// Contenido de cada categoría: título de la franja (banner), emoji/ícono y
// las fotos de la galería. "Mueble TV" no tiene fotos propias todavía —
// se sube desde el Panel Admin cuando haya productos reales de esa línea.
const CATEGORIAS = {
  modulares: {
    nombre: "Modulares",
    banner: "Confort Total",
    icono: "🛋️",
    fotos: ["1", "2", "3", "4"],
  },
  comedores: {
    nombre: "Comedores",
    banner: "El Arte de Compartir",
    icono: "🍽️",
    fotos: ["1", "2", "3", "4"],
  },
  dormitorios: {
    nombre: "Dormitorios",
    banner: "Descansa Como Mereces",
    icono: "🛏️",
    fotos: ["1", "2", "3", "4"],
  },
  "mesa-centro": {
    nombre: "Mesa de Centro",
    banner: "El Centro de tu Sala",
    icono: "🪑",
    fotos: ["1", "2", "3", "4"],
  },
  reflejos: {
    nombre: "Colección de Reflejos",
    banner: "Detalles que Iluminan",
    icono: "🪞",
    fotos: ["1", "2", "3"],
  },
  "mueble-tv": {
    nombre: "Mueble TV",
    banner: "Entretenimiento en Casa",
    icono: "📺",
    fotos: [],
  },
};

export default function CategoriaPagina() {
  const { slug } = useParams();
  const categoria = CATEGORIAS[slug];

  if (!categoria) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-xl text-ink-muted mb-4">Categoría no encontrada.</p>
        <Link to="/catalogo" className="text-gold font-bold">
          Ver catálogo completo
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="bg-gold text-carbon rounded-control px-5 py-3 mb-6 flex items-center gap-3">
        <span className="text-2xl">{categoria.icono}</span>
        <h1 className="text-xl sm:text-2xl font-extrabold">{categoria.banner}</h1>
      </div>

      {categoria.fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {categoria.fotos.map((n) => (
            <div key={n} className="rounded-card overflow-hidden border border-carbon-border aspect-square">
              <img
                src={`/assets/categorias/galeria/${slug}/${n}.jpg`}
                alt={categoria.nombre}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-ink-muted text-lg py-16">
          Todavía no hay fotos de {categoria.nombre} — pronto agregamos productos de esta línea.
        </p>
      )}

      <div className="text-center mt-8">
        <Link
          to="/catalogo"
          className="min-h-tap inline-flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold"
        >
          Ver Catálogo Completo
        </Link>
      </div>
    </div>
  );
}
