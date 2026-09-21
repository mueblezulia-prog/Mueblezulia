import { supabase } from "./supabaseClient";

/**
 * Contenido editable del sitio (tabla `contenido_sitio`), con
 * respaldo local por si la tabla todavía no tiene esa fila, o si
 * falla la conexión — así el sitio JAMÁS se rompe por esto, en el
 * peor caso muestra lo mismo que mostraba antes de existir el admin.
 *
 * Cada "clave" es un bloque independiente que se edita en
 * /admin/contenido: "nuestra_sede", "fabricacion", "metodos_pago".
 */
export const CONTENIDO_DEFAULT = {
  hero: {
    etiqueta: "Calidad · Tradición · Confort",
    titulo: "La Mueblería de la Familia Zuliana",
    subtitulo: "Llevando confort a los hogares del Zulia",
  },
  nuestra_sede: {
    imagen: "/assets/ubicacion.jpg", // se mantiene por compatibilidad (fondo de los banners); la foto/video real que se ve ahora sale de "imagenes"/"video" de abajo
    // Fondo de la sección: una o varias fotos (pasan solas si hay más de
    // una) o un video en bucle — lo que el admin elija con "tipoMedia".
    imagenes: ["/assets/ubicacion.jpg"],
    video: "",
    tipoMedia: "foto", // "foto" (una sola) | "diapositiva" (varias fotos que pasan solas) | "video"
    alto: "grande", // pequeno | mediano | grande | completo (ver ALTOS_BLOQUE)
    enfoque: "50% 50%", // qué parte de la foto/video se prioriza al recortar (ver SelectorEnfoque)
    direccion: "Av. 15 Delicias, frente a Alkosto, Maracaibo, Zulia",
    titulo: "¡Te esperamos en Muebles Zulia! 📍",
    texto: "Ven a conocer la calidad y el diseño que cambiarán tu hogar.",
    ajusteImagen: "cover", // "contain" = se ve la foto completa | "cover" = llena el marco (puede recortar)
    // Enlace real que se abre al tocar "Ver en Google Maps" — el que se
    // copia con el botón "Compartir" desde la app de Google Maps. Si se
    // deja vacío, se arma un enlace de búsqueda a partir de la dirección
    // de arriba (menos preciso: puede llevar a un lugar parecido, no al
    // exacto).
    enlaceMaps: "https://maps.app.goo.gl/7BH5HnExxbfUDWmJ9",
    // Horario tal como aparece en la ficha de Google Maps del negocio.
    horario: "Todos los días: 9:00 a.m. – 5:25 p.m.",
    // Coordenadas exactas del pin de "Mueble zulia" en Google Maps (se
    // sacaron del enlace de arriba). El mapa incrustado las usa para
    // centrarse justo en la mueblería — buscar solo por la dirección de
    // texto puede caer en un local vecino (p. ej. Alkosto) en vez del
    // negocio.
    coordenadas: "10.6804354,-71.6224744",
  },
  fabricacion: {
    titulo: "Pasión por el Detalle",
    texto:
      "En Muebles Zulia, la excelencia no es negociable. Supervisamos rigurosamente cada etapa de la confección, asegurándonos de que manos expertas trabajen con los mejores materiales para lograr los acabados impecables que tu hogar merece.",
    imagenes: [
      "/assets/carpinteria.jpg",
      "/assets/trabajador-4.jpg",
      "/assets/trabajador-2.png",
      "/assets/trabajador-3.png",
    ],
    ajusteImagen: "cover",
  },
  // Página "Fabricación": arrancamos con el mismo contenido de siempre
  // (una galería con el texto de "Pasión por el Detalle"), pero ya como
  // bloque editable — el admin puede agregar, quitar o reordenar todas
  // las secciones que quiera desde /admin/contenido.
  secciones_fabricacion: {
    bloques: [
      {
        id: "fabricacion-inicial",
        tipo: "galeria",
        titulo: "Pasión por el Detalle",
        texto:
          "En Muebles Zulia, la excelencia no es negociable. Supervisamos rigurosamente cada etapa de la confección, asegurándonos de que manos expertas trabajen con los mejores materiales para lograr los acabados impecables que tu hogar merece.",
        imagenes: [
          "/assets/carpinteria.jpg",
          "/assets/trabajador-4.jpg",
          "/assets/trabajador-2.png",
          "/assets/trabajador-3.png",
        ],
        alto: "mediano",
        ajusteImagen: "cover",
      },
    ],
  },
  // Secciones extra para la página "Ubicación" (Contacto) — vacío por
  // defecto; la dirección, foto y mapa de "Nuestra Sede" y la lista de
  // "Métodos de Pago" tienen su propio editor especial más abajo.
  secciones_ubicacion: {
    bloques: [],
  },
  metodos_pago: {
    metodos: [
      { nombre: "Efectivo", detalle: "Pago contra entrega o directo en nuestra sede.", icono: "/assets/icons/pago-efectivo.png" },
      { nombre: "Transferencia / Pago Móvil", detalle: "Te compartimos los datos bancarios al confirmar tu pedido.", icono: "/assets/icons/pago-movil.png" },
      { nombre: "Zelle", detalle: "Disponible para clientes en el exterior.", icono: "/assets/icons/pago-zelle.png" },
      { nombre: "Divisas (USD)", detalle: "Aceptamos dólares en efectivo.", icono: "/assets/icons/pago-divisas.png" },
    ],
  },
  // Secciones libres que el admin arma a su gusto (tipo, orden, fotos,
  // textos, tamaño) y que se muestran en la página de inicio, debajo de
  // "Fabricación". Ver AdminContenido.jsx → "Secciones Personalizadas".
  secciones_home: {
    bloques: [],
  },
};

/** Tamaños de imagen disponibles al armar un bloque (alto del marco). */
export const ALTOS_BLOQUE = {
  pequeno: "h-48",
  mediano: "h-72",
  grande: "h-96",
  completo: "h-[70vh] sm:h-[85vh]",
};

/**
 * Trae el bloque `clave` ya combinado con sus valores por defecto
 * (así si el admin solo llenó "direccion" pero no "titulo", el resto
 * sigue mostrando algo razonable en vez de quedar vacío).
 */
export async function obtenerContenido(clave) {
  const base = CONTENIDO_DEFAULT[clave] ?? {};
  try {
    const { data, error } = await supabase
      .from("contenido_sitio")
      .select("datos")
      .eq("clave", clave)
      .maybeSingle();
    if (error || !data) return base;
    return { ...base, ...data.datos };
  } catch {
    return base;
  }
}

/** Guarda (crea o reemplaza) el bloque `clave` completo. */
export async function guardarContenido(clave, datos) {
  const { error } = await supabase
    .from("contenido_sitio")
    .upsert({ clave, datos }, { onConflict: "clave" });
  if (error) throw error;
}
