/**
 * Formato único de precios para todo el sitio (antes cada tarjeta lo hacía
 * a su manera: un precio vacío salía como "$0" y uno inválido como "$NaN").
 */
export function formatearPrecio(precio) {
  if (precio === null || precio === undefined || precio === "" || Number.isNaN(Number(precio))) {
    return "Consultar";
  }
  return `$${Number(precio).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
