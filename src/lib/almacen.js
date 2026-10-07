import { supabase } from "./supabaseClient";

/**
 * Dónde se guardan las fotos y videos nuevos.
 * Si el servidor ya tiene R2 configurado (Cloudflare, sin cobro por tráfico),
 * van allá. Si no, siguen yendo a Supabase como antes: nada se rompe.
 */
const urls = new Map();

export async function subirAlmacen(bucket, nombre, archivo, opciones = {}) {
  const tipo = opciones.contentType || archivo?.type || "application/octet-stream";
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      const r = await fetch(`/api/r2/subir?nombre=${encodeURIComponent(nombre)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": tipo },
        body: archivo,
      });
      if (r.ok) {
        const j = await r.json();
        if (j?.url) {
          urls.set(nombre, j.url);
          return { error: null, url: j.url };
        }
      } else {
        const j = await r.clone().json().catch(() => ({}));
        // Solo se usa Supabase si R2 no está configurado (o el servidor es viejo).
        if (!(r.status === 404 || j.codigo === "r2_no_configurado")) {
          return { error: new Error(j.error || `No se pudo subir (${r.status}).`) };
        }
      }
    }
  } catch {
    // sin servidor (modo de prueba) → se usa Supabase
  }
  const res = await supabase.storage.from(bucket).upload(nombre, archivo, { upsert: true, ...opciones });
  return { error: res.error };
}

export function urlAlmacen(bucket, nombre) {
  return urls.get(nombre) ?? supabase.storage.from(bucket).getPublicUrl(nombre).data.publicUrl;
}

/**
 * Dirección que el navegador puede "leer" (para recortar en un canvas o fetch):
 * las fotos de R2 se piden a través de nuestro servidor porque R2 no manda permiso CORS.
 */
export function urlLeible(url) {
  return /^https:\/\/[^/]+\.r2\.dev\//i.test(url || "") ? `/api/r2/proxy?u=${encodeURIComponent(url)}` : url;
}
