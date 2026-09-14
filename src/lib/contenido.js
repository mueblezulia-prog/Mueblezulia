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
  nuestra_sede: {
    imagen: "/assets/ubicacion.jpg",
    direccion: "Av. 15 Delicias, frente a Alkosto, Maracaibo, Zulia",
    titulo: "¡Te esperamos en Muebles Zulia! 📍",
    texto: "Ven a conocer la calidad y el diseño que cambiarán tu hogar.",
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
  },
  metodos_pago: {
    metodos: [
      { nombre: "Efectivo", detalle: "Pago contra entrega o directo en nuestra sede.", icono: "💵" },
      { nombre: "Transferencia / Pago Móvil", detalle: "Te compartimos los datos bancarios al confirmar tu pedido.", icono: "🏦" },
      { nombre: "Zelle", detalle: "Disponible para clientes en el exterior.", icono: "💳" },
      { nombre: "Divisas (USD)", detalle: "Aceptamos dólares en efectivo.", icono: "💲" },
    ],
  },
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
