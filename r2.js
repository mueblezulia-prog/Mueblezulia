// Fotos en Cloudflare R2 (no cobra por el tráfico de salida, a diferencia de Supabase).
// Sin dependencias: firma las peticiones a R2 con AWS SigV4 usando "crypto".
// Variables de Railway: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET, R2_PUBLIC_URL (https://pub-xxxx.r2.dev).
import crypto from "crypto";
import express from "express";

const sha256 = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** Firma SigV4. Devuelve { authorization, headers }. Función pura (se prueba con el ejemplo oficial de AWS). */
export function firmarSigV4({ method, host, path, query = "", headers = {}, payloadHash, region, service = "s3", accessKey, secretKey, fecha }) {
  const amzDate = fecha.replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dia = amzDate.slice(0, 8);
  const todos = { ...headers, host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  const nombres = Object.keys(todos).map((h) => h.toLowerCase()).sort();
  const canonHeaders = nombres.map((h) => `${h}:${String(Object.entries(todos).find(([k]) => k.toLowerCase() === h)[1]).trim()}\n`).join("");
  const firmados = nombres.join(";");
  const canonica = [method, path, query, canonHeaders, firmados, payloadHash].join("\n");
  const alcance = `${dia}/${region}/${service}/aws4_request`;
  const aFirmar = ["AWS4-HMAC-SHA256", amzDate, alcance, sha256(canonica)].join("\n");
  const kFirma = hmac(hmac(hmac(hmac("AWS4" + secretKey, dia), region), service), "aws4_request");
  const firma = crypto.createHmac("sha256", kFirma).update(aFirmar).digest("hex");
  return {
    firma,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${alcance}, SignedHeaders=${firmados}, Signature=${firma}`,
    headers: { ...todos, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${alcance}, SignedHeaders=${firmados}, Signature=${firma}` },
  };
}

function config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return { cuenta: R2_ACCOUNT_ID, accessKey: R2_ACCESS_KEY_ID, secretKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET, publica: R2_PUBLIC_URL.replace(/\/+$/, "") };
}

async function ponerObjeto(c, clave, cuerpo, contentType) {
  const host = `${c.cuenta}.r2.cloudflarestorage.com`;
  const path = "/" + [c.bucket, ...clave.split("/")].map(enc).join("/");
  const f = firmarSigV4({
    method: "PUT", host, path, payloadHash: sha256(cuerpo), region: "auto",
    headers: { "content-type": contentType, "cache-control": "public, max-age=3600" },
    accessKey: c.accessKey, secretKey: c.secretKey, fecha: new Date().toISOString(),
  });
  const r = await fetch(`https://${host}${path}`, { method: "PUT", headers: f.headers, body: cuerpo });
  if (!r.ok) throw new Error(`R2 respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${c.publica}/${clave}`;
}

const NOMBRE_OK = /^[A-Za-z0-9][A-Za-z0-9/_.\-]{0,220}$/;
const nombreValido = (n) => typeof n === "string" && NOMBRE_OK.test(n) && !n.includes("..") && !n.includes("//");

/** Rutas: POST /api/r2/subir?nombre=…  (cuerpo = archivo)   POST /api/r2/copiar {nombre}  (trae de Supabase y guarda en R2) */
export function montarR2(app, requireSesion) {
  app.get("/api/r2/estado", requireSesion, (req, res) => res.json({ ok: true, activo: !!config() }));

  app.post("/api/r2/subir", requireSesion, express.raw({ type: () => true, limit: "60mb" }), async (req, res) => {
    const c = config();
    if (!c) return res.status(503).json({ ok: false, codigo: "r2_no_configurado", error: "R2 todavía no está configurado en Railway." });
    const nombre = req.query.nombre;
    if (!nombreValido(nombre)) return res.status(400).json({ ok: false, error: "Nombre de archivo no válido." });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ ok: false, error: "No llegó ningún archivo." });
    try {
      const url = await ponerObjeto(c, nombre, req.body, req.header("content-type") || "application/octet-stream");
      res.json({ ok: true, url });
    } catch (e) {
      console.error("R2 subir:", e.message);
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  // Trae una foto de R2 desde nuestro mismo sitio, para poder recortarla
  // en el navegador (R2 no manda el permiso CORS). Solo fotos de nuestro bucket.
  app.get("/api/r2/proxy", async (req, res) => {
    const publica = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
    const u = String(req.query.u || "");
    if (!publica || !u.startsWith(publica + "/") || u.includes("..")) return res.status(400).end();
    try {
      const r = await fetch(u);
      if (!r.ok) return res.status(r.status).end();
      res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch {
      res.status(502).end();
    }
  });

  app.post("/api/r2/copiar", requireSesion, express.json(), async (req, res) => {
    const c = config();
    if (!c) return res.status(503).json({ ok: false, codigo: "r2_no_configurado", error: "R2 todavía no está configurado en Railway." });
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const nombre = req.body?.nombre;
    if (!base || !nombreValido(nombre)) return res.status(400).json({ ok: false, error: "Datos no válidos." });
    try {
      // Si ya está en R2, no se vuelve a bajar de Supabase (no gasta tráfico).
      const ya = await fetch(`${c.publica}/${nombre.split("/").map(enc).join("/")}`, { method: "HEAD" }).catch(() => null);
      if (ya && ya.ok) return res.json({ ok: true, url: `${c.publica}/${nombre}`, ya: true });
      const origen = await fetch(`${base}/storage/v1/object/public/productos/${nombre.split("/").map(enc).join("/")}`);
      if (!origen.ok) return res.status(404).json({ ok: false, error: `No se pudo leer ${nombre} (${origen.status}).` });
      const buf = Buffer.from(await origen.arrayBuffer());
      const url = await ponerObjeto(c, nombre, buf, origen.headers.get("content-type") || "application/octet-stream");
      res.json({ ok: true, url, bytes: buf.length });
    } catch (e) {
      console.error("R2 copiar:", e.message);
      res.status(502).json({ ok: false, error: e.message });
    }
  });
}
