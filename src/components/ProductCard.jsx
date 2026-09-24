import { Link } from "react-router-dom";
import { sonidoNavegar } from "../lib/sonido";
import { obtenerEtiquetasProducto } from "../lib/etiquetas";
import { formatearPrecio } from "../lib/formato";
import EtiquetasBadges from "./EtiquetasBadges";
import BadgeDisponibilidad from "./BadgeDisponibilidad";

/**
 * Tarjeta de producto para el catálogo (cliente). Imagen grande con
 * degradado y precio superpuesto estilo "badge", título debajo. Toda la
 * tarjeta es un solo link al detalle del producto.
 */
export default function ProductCard({ producto }) {
  const { id, titulo, precio, imagen_recortada_url, medida } = producto;
  const etiquetas = obtenerEtiquetasProducto(producto);

  return (
    <Link
      to={`/producto/${id}`}
      onClick={sonidoNavegar}
      className="group relative rounded-card flex flex-col min-w-0 focus-within:z-20 has-[[aria-expanded=true]]:z-20
                 glass hover:border-gold/50 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5
                 active:scale-[0.98] transition-all duration-300 ease-out"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-card bg-carbon">
        {imagen_recortada_url ? (
          <img
            src={imagen_recortada_url}
            alt={titulo}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          // Sin foto todavía: logo tenue en vez del ícono de "imagen rota".
          <div className="w-full h-full flex items-center justify-center">
            <img src="/assets/logo.png" alt="" className="w-14 h-14 object-contain opacity-30" />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 flex items-center gap-1 bg-gold text-carbon text-sm sm:text-base font-extrabold px-2 sm:px-2.5 py-1 rounded-control shadow-md shadow-black/30">
          <img src="/assets/icons/precio-tag.png" alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
          {formatearPrecio(precio)}
        </span>
      </div>
      {/* La insignia vive FUERA del recuadro con overflow-hidden de la foto,
          para que su explicación (al tocarla) no quede cortada. */}
      <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 max-w-[calc(100%-1rem)]">
        <BadgeDisponibilidad disponible={producto.disponible_entrega ?? true} hacia="abajo" compacto />
      </span>
      <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 flex-1 min-w-0 bg-white/[0.03] backdrop-blur-sm border-t border-white/10 rounded-b-card">
        <h3 className="text-base sm:text-lg font-bold text-ink leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-200">
          {titulo}
        </h3>
        <div className="flex flex-wrap gap-1 min-w-0">
          {medida && (
            <span className="inline-flex items-center gap-1 self-start max-w-full text-xs text-ink-muted bg-white/5 border border-white/10 rounded-control px-2 py-0.5">
              <span aria-hidden="true">📏</span>
              <span className="truncate">{medida}</span>
            </span>
          )}
          <EtiquetasBadges etiquetas={etiquetas} compacto tamano="sm" />
        </div>
      </div>
    </Link>
  );
}
