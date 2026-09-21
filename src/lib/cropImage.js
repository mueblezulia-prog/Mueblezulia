// Utilidad estándar para recortar una imagen en el navegador usando <canvas>,
// a partir del `croppedAreaPixels` que entrega react-easy-crop.
// Devuelve un Blob JPEG listo para subir a Supabase Storage.

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous"; // necesario si la imagen viene de Supabase Storage
    image.src = url;
  });
}

/**
 * @param {string} imageSrc URL de la imagen original (sin recortar)
 * @param {{x:number,y:number,width:number,height:number}} pixelCrop croppedAreaPixels de react-easy-crop
 * @param {number} rotation grados de rotación (0 si no se usa)
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.save();
  if (rotation) {
    const rad = (rotation * Math.PI) / 180;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

function gradosARadianes(grados) {
  return (grados * Math.PI) / 180;
}

// Cuánto mide el "rectángulo que envuelve" a la imagen una vez girada
// (girar una foto rectangular la hace ocupar más espacio en diagonal).
function tamanoTrasGirar(ancho, alto, grados) {
  const rad = gradosARadianes(grados);
  return {
    width: Math.abs(Math.cos(rad) * ancho) + Math.abs(Math.sin(rad) * alto),
    height: Math.abs(Math.sin(rad) * ancho) + Math.abs(Math.cos(rad) * alto),
  };
}

/**
 * Igual que getCroppedImageBlob, pero calculando bien el recorte cuando SÍ
 * se usa una rotación distinta de 0 (grados, puede tener decimales). La
 * versión de arriba rota el resultado ya recortado, lo cual solo da bien
 * si la rotación es 0; esta primero gira la foto completa sobre un lienzo
 * lo bastante grande para no perder esquinas, y RECIÉN ahí aplica el
 * recorte que entrega react-easy-crop (que ya calcula pixelCrop teniendo
 * en cuenta esa rotación).
 *
 * @param {string} imageSrc URL de la imagen original (sin recortar)
 * @param {{x:number,y:number,width:number,height:number}} pixelCrop croppedAreaPixels de react-easy-crop (con la MISMA rotación pasada abajo)
 * @param {number} rotation grados de rotación (puede ser negativo o con decimales)
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlobRotado(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const rotRad = gradosARadianes(rotation);
  const { width: anchoLienzo, height: altoLienzo } = tamanoTrasGirar(image.width, image.height, rotation);

  const canvas = document.createElement("canvas");
  canvas.width = anchoLienzo;
  canvas.height = altoLienzo;
  const ctx = canvas.getContext("2d");

  ctx.translate(anchoLienzo / 2, altoLienzo / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const datos = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(datos, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
