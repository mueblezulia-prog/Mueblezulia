import { useEffect, useState } from "react";

/**
 * La foto/video de fondo de "Nuestra Sede" (Inicio y Contacto). Antes era
 * siempre una sola foto fija; ahora admite foto única, varias fotos que
 * pasan solas (diapositiva) o un video en bucle — lo que el admin haya
 * elegido en /admin/contenido.
 *
 * `aspecto`: si la foto se recortó a una proporción exacta (ver
 * RecortadorContenido), aquí llega como texto CSS ("16 / 9", etc.) y el
 * marco usa esa proporción en vez de depender solo de `alto` — así nunca
 * se recorta una segunda vez al mostrarla.
 *
 * No trae su propio borde ni esquinas redondeadas: el contenedor que lo
 * usa (Home.jsx, Contacto.jsx) ya se encarga de eso, así no se duplica.
 */
export default function FondoMultimedia({ imagenes = [], video, tipoMedia = "foto", alto, ajuste, alt = "", aspecto }) {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;
  const estiloMarco = aspecto ? { aspectRatio: aspecto } : undefined;

  useEffect(() => {
    if (tipoMedia === "video" || total <= 1) return;
    const temporizador = setTimeout(() => setIndice((i) => (i + 1) % total), 4000);
    return () => clearTimeout(temporizador);
  }, [indice, total, tipoMedia]);

  if (tipoMedia === "video" && video) {
    return <video src={video} className={`w-full ${alto} ${ajuste}`} style={estiloMarco} autoPlay muted loop playsInline />;
  }

  if (total === 0) return null;

  if (total === 1) {
    return <img src={imagenes[0]} alt={alt} className={`w-full ${alto} ${ajuste}`} style={estiloMarco} />;
  }

  return (
    <div className={`relative w-full ${alto}`} style={estiloMarco}>
      {imagenes.map((url, i) => (
        <img
          key={url + i}
          src={url}
          alt={alt}
          className={`carrusel-slide absolute inset-0 w-full h-full ${ajuste} ${i === indice ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}
