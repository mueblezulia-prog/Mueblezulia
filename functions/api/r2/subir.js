// POST /api/r2/subir?nombre=carpeta/archivo.webp  (cuerpo = la foto)
// Guarda la foto en el bucket de R2 conectado como "FOTOS".
import { json, verificarSesion, publicaR2, nombreValido } from "../../../cf/comun.js";

export async function onRequestPost({ request, env }) {
  const publica = publicaR2(env);
  if (!env.FOTOS || !publica) {
    return json({ ok: false, codigo: "r2_no_configurado", error: "Falta conectar el bucket R2 (FOTOS) o R2_PUBLIC_URL en Cloudflare Pages." }, 503);
  }
  const fallo = await verificarSesion(request, env);
  if (fallo) return fallo;
  const nombre = new URL(request.url).searchParams.get("nombre");
  if (!nombreValido(nombre)) return json({ ok: false, error: "Nombre de archivo no válido." }, 400);
  const cuerpo = await request.arrayBuffer();
  if (!cuerpo.byteLength) return json({ ok: false, error: "No llegó ningún archivo." }, 400);
  if (cuerpo.byteLength > 95 * 1024 * 1024) return json({ ok: false, error: "El archivo es muy grande (máximo 95 MB)." }, 413);
  try {
    await env.FOTOS.put(nombre, cuerpo, {
      httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream", cacheControl: "public, max-age=3600" },
    });
    return json({ ok: true, url: `${publica}/${nombre}` });
  } catch (e) {
    return json({ ok: false, error: `No se pudo guardar en R2: ${e.message}` }, 502);
  }
}
