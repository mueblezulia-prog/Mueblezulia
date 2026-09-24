import { supabase } from "./supabaseClient";

/**
 * Registro de visitas para la página "Estadísticas" del panel.
 *
 * Qué se guarda: qué página se abrió, qué mueble, de dónde llegó la
 * persona (WhatsApp, Instagram, Google…), si usa celular o computador y
 * la ciudad aproximada. NO se guarda nombre, teléfono ni dirección IP.
 *
 * Tus propias visitas no cuentan: al iniciar sesión en el panel, ese
 * navegador queda marcado como "admin" y se ignora.
 *
 * Todo esto es "a mejor esfuerzo": si falla (sin internet, bloqueador de
 * anuncios, tabla todavía no creada), el sitio sigue funcionando igual.
 */

function leer(almacen, clave) {
  try {
    return almacen.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(almacen, clave, valor) {
  try {
    almacen.setItem(clave, valor);
  } catch {
    /* sin almacenamiento disponible */
  }
}

function esNavegadorDelAdmin() {
  return leer(localStorage, "mz_admin") === "1";
}

// Número al azar guardado en el navegador: sirve para contar cuántas
// PERSONAS distintas visitan (no quién es cada una).
function idVisitante() {
  let id = leer(localStorage, "mz_visitante");
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 36);
    guardar(localStorage, "mz_visitante", id);
  }
  return id;
}

function tipoDispositivo() {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "Celular";
  return "Computador";
}

// De dónde llegó la persona. Se calcula una sola vez por visita (al
// entrar), para que navegar dentro del sitio no cambie el origen.
function origenDeLaVisita() {
  const guardado = leer(sessionStorage, "mz_origen");
  if (guardado) return guardado;

  const params = new URLSearchParams(window.location.search);
  const utm = (params.get("utm_source") || "").toLowerCase();
  let origen = "Directo";
  const ref = document.referrer;
  let host = "";
  try {
    host = ref ? new URL(ref).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  const pista = `${utm} ${host}`;

  if (host && host === window.location.hostname) origen = "Directo";
  else if (/whatsapp|wa\.me/.test(pista)) origen = "WhatsApp";
  else if (/instagram/.test(pista) || params.has("igshid")) origen = "Instagram";
  else if (/facebook|fb\.|messenger/.test(pista) || params.has("fbclid")) origen = "Facebook";
  else if (/tiktok/.test(pista)) origen = "TikTok";
  else if (/google/.test(pista) || params.has("gclid")) origen = "Google";
  else if (/bing|yahoo|duckduckgo/.test(pista)) origen = "Otro buscador";
  else if (/t\.co|twitter|x\.com/.test(pista)) origen = "X (Twitter)";
  else if (host) origen = host.replace(/^www\./, "");

  guardar(sessionStorage, "mz_origen", origen);
  return origen;
}

// Ubicación aproximada (país/ciudad), la calcula nuestro propio servidor
// UNA vez por visita. Si no responde, se deja vacía.
let promesaUbicacion = null;
function ubicacion() {
  const guardada = leer(sessionStorage, "mz_ubicacion");
  if (guardada) {
    try {
      return Promise.resolve(JSON.parse(guardada));
    } catch {
      /* dato roto: se vuelve a pedir */
    }
  }
  if (!promesaUbicacion) {
    promesaUbicacion = fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => {
        const datos = { pais: d.pais ?? null, region: d.region ?? null, ciudad: d.ciudad ?? null };
        if (datos.pais) guardar(sessionStorage, "mz_ubicacion", JSON.stringify(datos));
        return datos;
      });
  }
  return promesaUbicacion;
}

let ultimo = { clave: "", momento: 0 };

async function registrar(tipo, ruta, productoId) {
  if (typeof window === "undefined" || esNavegadorDelAdmin()) return;
  // Evita contar dos veces la misma página si se registra dos veces
  // seguidas en menos de 3 segundos (pasa al recargar rápido).
  const clave = `${tipo}|${ruta}`;
  const ahora = Date.now();
  if (clave === ultimo.clave && ahora - ultimo.momento < 3000) return;
  ultimo = { clave, momento: ahora };

  try {
    const geo = await ubicacion();
    await supabase.from("visitas").insert({
      tipo,
      ruta,
      producto_id: productoId ? String(productoId) : null,
      visitante: idVisitante(),
      origen: origenDeLaVisita(),
      dispositivo: tipoDispositivo(),
      pais: geo.pais,
      region: geo.region,
      ciudad: geo.ciudad,
    });
  } catch {
    /* las estadísticas nunca deben romper el sitio */
  }
}

/** Una página del sitio se abrió. */
export function registrarVisita(ruta) {
  const coincide = ruta.match(/^\/producto\/([^/]+)/);
  return registrar("vista", ruta, coincide ? coincide[1] : null);
}

/** Alguien tocó "Preguntar por WhatsApp" (o "Escribir por WhatsApp"). */
export function registrarClicWhatsApp(productoId) {
  return registrar("whatsapp", window.location.pathname, productoId);
}
