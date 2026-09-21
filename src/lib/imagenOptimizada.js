import { convertirSiEsHeic } from "./heic";

// Lado más largo que puede tener una foto subida al sitio — de sobra
// para verse nítida a pantalla completa en un celular, pero sin guardar
// megapixeles de más que solo ocupan espacio sin notarse.
const DIMENSION_MAXIMA = 1600;
const CALIDAD_WEBP = 0.82;

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Deja una foto lista para subir: primero la pasa por convertirSiEsHeic
 * (por si viene de iPhone), y luego la reduce a un tamaño razonable y la
 * convierte a WebP — se ve prácticamente igual pero pesa mucho menos, así
 * el sitio carga más rápido y se gasta menos espacio de almacenamiento.
 *
 * Si el navegador no puede convertir a WebP (muy raro, o algún error al
 * procesar), se sube la foto tal como venía en vez de romper la subida.
 */
export async function prepararImagen(file, { maxDimension = DIMENSION_MAXIMA, calidad = CALIDAD_WEBP } = {}) {
  const listo = await convertirSiEsHeic(file);
  try {
    const url = URL.createObjectURL(listo);
    let img;
    try {
      img = await cargarImagen(url);
    } finally {
      URL.revokeObjectURL(url);
    }

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      const escala = maxDimension / Math.max(width, height);
      width = Math.round(width * escala);
      height = Math.round(height * escala);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", calidad));
    if (!blob || blob.type !== "image/webp") return listo; // el navegador no sabe generar WebP: se sube la original

    const nombreBase = (listo.name || "foto").replace(/\.[a-z0-9]+$/i, "");
    return new File([blob], `${nombreBase}.webp`, { type: "image/webp" });
  } catch {
    // Cualquier problema al procesar (formato raro, navegador viejo, etc.)
    // no debe bloquear la subida — se sube la foto tal como venía.
    return listo;
  }
}

/**
 * Igual que prepararImagen, pero para cuando la foto YA es una imagen
 * normal (por ejemplo, el resultado de recortarla con el cropper) — no
 * pasa por convertirSiEsHeic, solo reduce el tamaño y convierte a WebP.
 * Devuelve un Blob (no un File).
 */
export async function optimizarBlob(blob, { maxDimension = DIMENSION_MAXIMA, calidad = CALIDAD_WEBP } = {}) {
  try {
    const url = URL.createObjectURL(blob);
    let img;
    try {
      img = await cargarImagen(url);
    } finally {
      URL.revokeObjectURL(url);
    }

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      const escala = maxDimension / Math.max(width, height);
      width = Math.round(width * escala);
      height = Math.round(height * escala);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    const salida = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", calidad));
    if (!salida || salida.type !== "image/webp") return blob;
    return salida;
  } catch {
    return blob;
  }
}
