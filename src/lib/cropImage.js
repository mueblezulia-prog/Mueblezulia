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
