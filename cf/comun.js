// Utilidades compartidas por las funciones de Cloudflare Pages (carpeta functions/).
export const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

/** ¿Quien llama inició sesión en el panel? (token de Supabase). Devuelve null si sí, o una Response de error. */
export async function verificarSesion(request, env) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const clave = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !clave) return json({ ok: false, error: "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Cloudflare Pages → Settings → Variables." }, 500);
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, error: "Inicia sesión en el panel para usar esta función." }, 401);
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: clave, Authorization: `Bearer ${token}` } });
    if (!r.ok) return json({ ok: false, error: "Tu sesión venció. Vuelve a iniciar sesión en el panel." }, 401);
    return null;
  } catch {
    return json({ ok: false, error: "No se pudo verificar la sesión. Intenta de nuevo." }, 503);
  }
}

export const publicaR2 = (env) => String(env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
const NOMBRE_OK = /^[A-Za-z0-9][A-Za-z0-9/_.\-]{0,220}$/;
export const nombreValido = (n) => typeof n === "string" && NOMBRE_OK.test(n) && !n.includes("..") && !n.includes("//");
