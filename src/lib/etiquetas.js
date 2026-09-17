/**
 * Junta en una sola lista las insignias de un producto: las dos fijas
 * ("Disponible en todas las telas", "El color de tu preferencia") más
 * las etiquetas personalizadas que el admin le haya asignado desde el
 * catálogo de /admin/etiquetas. Cada item queda como
 * { id, icono, texto } listo para dibujar.
 */
export function obtenerEtiquetasProducto(producto) {
  const lista = [];

  if (producto.disponible_todas_telas) {
    lista.push({ id: "todas-telas", icono: "/assets/icons/tela.png", texto: "Todas las telas" });
  }
  if (producto.color_a_eleccion) {
    lista.push({ id: "color-eleccion", icono: "/assets/icons/color-elegir.png", texto: "El color de tu preferencia" });
  }

  const extra = (producto.producto_etiquetas ?? [])
    .map((fila) => fila.etiquetas)
    .filter(Boolean);
  for (const etiqueta of extra) {
    lista.push({ id: `etq-${etiqueta.id}`, icono: etiqueta.icono, texto: etiqueta.nombre });
  }

  return lista;
}
