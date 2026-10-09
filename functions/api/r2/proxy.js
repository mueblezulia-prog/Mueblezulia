// GET /api/r2/proxy?u=<dirección pública de R2>
// Entrega la foto desde nuestro mismo sitio, para poder recortarla en el navegador.
import { publicaR2 } from "../../../cf/comun.js";

export async function onRequestGet({ request, env }) {
  const publica = publicaR2(env);
  const u = new URL(request.url).searchParams.get("u") || "";
  if (!publica || !u.startsWith(publica + "/") || u.includes("..")) return new Response(null, { status: 400 });
  const clave = decodeURIComponent(u.slice(publica.length + 1));
  try {
    if (env.FOTOS) {
      const obj = await env.FOTOS.get(clave);
      if (!obj) return new Response(null, { status: 404 });
      return new Response(obj.body, {
        headers: { "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=3600" },
      });
    }
    const r = await fetch(u);
    return new Response(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") || "application/octet-stream" } });
  } catch {
    return new Response(null, { status: 502 });
  }
}
