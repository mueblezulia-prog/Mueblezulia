import heic2any from "heic2any";

/**
 * Los iPhone guardan las fotos en formato HEIC/HEIF por defecto. Ningún
 * navegador (salvo Safari en Mac/iOS) sabe mostrar ni procesar ese formato
 * en un <img>, <canvas> o al subirlo tal cual — por eso antes de esto una
 * foto HEIC rompía el cropper y la vista previa. Esta función convierte el
 * archivo a JPEG en el propio navegador (sin pasar por ningún servidor)
 * antes de usarlo en cualquier parte del panel admin.
 *
 * IMPORTANTE: "heic2any" se importa de forma NORMAL (no con import
 * dinámico) a propósito. Antes se cargaba solo cuando hacía falta, pero
 * eso dependía de que el navegador pudiera pedir ese pedazo extra del
 * sitio en el momento exacto de subir una foto — si esa descarga fallaba
 * (por ejemplo, justo después de subir una actualización del sitio, o con
 * una conexión inestable), la foto HEIC quedaba sin poder subirse. Al
 * venir incluida desde el principio, subir una foto HEIC ya no depende de
 * esa segunda descarga.
 */
export function esArchivoHeic(file) {
  if (!file) return false;
  const nombre = (file.name || "").toLowerCase();
  const tipo = (file.type || "").toLowerCase();
  return (
    tipo === "image/heic" ||
    tipo === "image/heif" ||
    nombre.endsWith(".heic") ||
    nombre.endsWith(".heif")
  );
}

export async function convertirSiEsHeic(file) {
  if (!esArchivoHeic(file)) return file;

  let resultado;
  try {
    resultado = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  } catch (err) {
    // Un HEIC de "ráfaga en vivo" (Live Photo) o uno dañado puede hacer
    // que la conversión falle — con un mensaje claro, en vez de quedarse
    // "colgado" sin explicación.
    throw new Error(
      "No se pudo convertir esta foto HEIC. Prueba exportarla como JPG desde el iPhone (compartir → guardar como) y subirla de nuevo."
    );
  }
  // heic2any puede devolver un array de blobs si el HEIC trae varias fotos
  // (ráfaga en vivo); esta app solo usa la primera.
  const blob = Array.isArray(resultado) ? resultado[0] : resultado;

  const nombreOriginal = (file.name || "foto").replace(/\.(heic|heif)$/i, "");
  return new File([blob], `${nombreOriginal}.jpg`, { type: "image/jpeg" });
}
