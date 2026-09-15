/**
 * Los iPhone guardan las fotos en formato HEIC/HEIF por defecto. Ningún
 * navegador (salvo Safari en Mac/iOS) sabe mostrar ni procesar ese formato
 * en un <img>, <canvas> o al subirlo tal cual — por eso antes de esto una
 * foto HEIC rompía el cropper y la vista previa. Esta función convierte el
 * archivo a JPEG en el propio navegador (sin pasar por ningún servidor)
 * antes de usarlo en cualquier parte del panel admin.
 *
 * La librería "heic2any" es pesada, así que se carga sólo cuando hace
 * falta (import dinámico) en vez de venir en el bundle principal del sitio.
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

  let heic2any;
  try {
    heic2any = (await import("heic2any")).default;
  } catch (err) {
    // Mismo caso que el listener de vite:preloadError en main.jsx: el
    // sitio se actualizó y este navegador todavía tiene la versión
    // vieja cargada. Recargamos para traer la nueva versión — cuando
    // la persona vuelva a intentar subir la foto, ya va a funcionar.
    window.location.reload();
    throw new Error("El sitio se actualizó, recargando la página. Por favor intenta subir la foto de nuevo en un momento.");
  }

  const resultado = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  // heic2any puede devolver un array de blobs si el HEIC trae varias fotos
  // (ráfaga en vivo); esta app solo usa la primera.
  const blob = Array.isArray(resultado) ? resultado[0] : resultado;

  const nombreOriginal = (file.name || "foto").replace(/\.(heic|heif)$/i, "");
  return new File([blob], `${nombreOriginal}.jpg`, { type: "image/jpeg" });
}
