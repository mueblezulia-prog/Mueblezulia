import { Link } from "react-router-dom";

/**
 * Tarjeta de producto para el catálogo (cliente).
 * La imagen usada es SIEMPRE `imagen_recortada_url` — la versión ya recortada
 * por el administrador (módulo Crop & Scale). El <img> se muestra con su
 * proporción natural (sin aspect-ratio fijo en CSS), así la altura de la
 * tarjeta se adapta automáticamente al encuadre que definió el admin.
 */
export default function ProductCard({ producto, onComprar, onCompraPersonalizada }) {
  const { id, titulo, descripcion_corta, precio, imagen_recortada_url } = producto;

  return (
    <article className="bg-carbon-light border border-carbon-border rounded-card overflow-hidden flex flex-col">
      <Link to={`/producto/${id}`} className="block">
        <img
          src={imagen_recortada_url}
          alt={titulo}
          className="w-full h-auto block"
          loading="lazy"
        />
      </Link>

      <div className="p-4 flex flex-col gap-3">
        <Link to={`/producto/${id}`}>
          <h3 className="text-xl font-bold text-ink">{titulo}</h3>
        </Link>

        {descripcion_corta && (
          <p className="text-ink-muted text-base line-clamp-4">{descripcion_corta}</p>
        )}

        <p className="text-price font-extrabold text-gold">
          ${Number(precio).toLocaleString("es-VE")}
        </p>

        <div className="flex flex-col gap-2 mt-1">
          <button
            type="button"
            onClick={() => onComprar?.(producto)}
            className="btn-primary"
          >
            Comprar Ahora
          </button>
          <button
            type="button"
            onClick={() => onCompraPersonalizada?.(producto)}
            className="btn-secondary"
          >
            Compra Personalizada
          </button>
        </div>
      </div>
    </article>
  );
}
