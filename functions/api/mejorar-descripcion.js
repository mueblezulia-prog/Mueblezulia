// POST /api/mejorar-descripcion — "Mejorar con IA" (Gemini) desde el servidor,
// para no mostrar la llave GEMINI_API_KEY al público. Solo para quien inició sesión.
import { json, verificarSesion } from "../../cf/comun.js";

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) return json({ ok: false, error: "Falta GEMINI_API_KEY en Cloudflare Pages → Settings → Variables." }, 500);
  const fallo = await verificarSesion(request, env);
  if (fallo) return fallo;
  const { texto, tipo } = await request.json().catch(() => ({}));
  if (!texto || !String(texto).trim()) return json({ ok: false, error: "Escribe primero una descripción para mejorar." }, 400);
  const modelo = env.GEMINI_MODEL || "gemini-3.6-flash";
  const instrucciones =
    tipo === "corta"
      ? "Mejora esta descripción CORTA de un mueble para que suene más atractiva y vendedora, en español de Venezuela. Debe quedar en UNA sola frase breve (máximo 15 palabras), sin comillas ni emojis. Devuelve SOLO el texto mejorado, nada más."
      : "Mejora esta descripción LARGA de un mueble para que suene más atractiva y vendedora, en español de Venezuela, resaltando materiales, comodidad y estilo. Entre 2 y 4 frases. Devuelve SOLO el texto mejorado, sin comillas, títulos ni emojis.";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${instrucciones}\n\nDescripción original:\n"${String(texto).trim()}"` }] }] }),
    });
    const datos = await r.json();
    if (!r.ok) throw new Error(datos?.error?.message || "Gemini respondió con un error.");
    const mejorado = datos?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!mejorado) throw new Error("Gemini no devolvió ningún texto.");
    return json({ ok: true, mejorado });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}
