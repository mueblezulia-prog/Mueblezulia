import { Link } from "react-router-dom";

/**
 * Tarjeta de producto para el catálogo (cliente).
 * Solo imagen + nombre + precio — sin botones ni descripción, tal como
 * se pidió (estilo "Wood chair $109.99" de la referencia). Toda la tarjeta
 * es un solo link al detalle del producto.
 */
export default function ProductCard({ producto }) {
  const { id, titulo, precio, imagen_recortada_url } = producto;

  return (
    <Link
      to={`/producto/${id}`}
      className="bg-carbon-light border border-carbon-border rounded-card overflow-hidden flex flex-col hover:border-ink-muted transition-colors"
    >
      <img
        src={imagen_recortada_url}
        alt={titulo}
        className="w-full h-auto block"
        loading="lazy"
      />
      <div className="p-4 flex flex-col gap-1">
        <h3 className="text-lg font-bold text-ink leading-snug">{titulo}</h3>
        <p className="text-price font-extrabold text-gold">
          ${Number(precio).toLocaleString("es-VE")}
        </p>
      </div>
    </Link>
  );
}
