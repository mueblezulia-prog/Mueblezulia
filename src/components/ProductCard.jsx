import { Link } from "react-router-dom";

/**
 * Tarjeta de producto para el catálogo (cliente). Imagen grande con
 * degradado y precio superpuesto estilo "badge", título debajo. Toda la
 * tarjeta es un solo link al detalle del producto.
 */
export default function ProductCard({ producto }) {
  const { id, titulo, precio, imagen_recortada_url, medida } = producto;

  return (
    <Link
      to={`/producto/${id}`}
      className="group bg-carbon-light border border-carbon-border rounded-card overflow-hidden flex flex-col
                 shadow-sm hover:shadow-xl hover:shadow-black/30 hover:border-gold/60 hover:-translate-y-0.5
                 transition-all duration-300 ease-out"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-carbon">
        <img
          src={imagen_recortada_url}
          alt={titulo}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
          loading="lazy"
        />
        <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 bg-gold text-carbon text-sm sm:text-base font-extrabold px-2.5 py-1 rounded-control shadow-md shadow-black/30">
          ${Number(precio).toLocaleString("es-VE")}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <h3 className="text-base sm:text-lg font-bold text-ink leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-200">
          {titulo}
        </h3>
        {medida && <p className="text-xs text-ink-muted">📏 {medida}</p>}
      </div>
    </Link>
  );
}
