// Datos de contacto en UN solo lugar (antes el número estaba repetido en
// varias páginas, y si cambiaba había que acordarse de todas).
export const WHATSAPP_NUMERO = "584127519141"; // +58 412 751 9141

export function linkWhatsApp(mensaje) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}
