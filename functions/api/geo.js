// GET /api/geo — país/región/ciudad aproximados de la visita (para Estadísticas).
// Cloudflare ya lo sabe por la conexión: no se llama a ningún servicio de afuera ni se guarda la IP.
import { json } from "../../cf/comun.js";
const PAISES = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["es"], { type: "region" }) : null;

export function onRequestGet({ request }) {
  const cf = request.cf || {};
  let pais = cf.country || null;
  try {
    if (pais && PAISES) pais = PAISES.of(pais) || pais;
  } catch {
    /* se deja el código */
  }
  return json({ pais, region: cf.region || null, ciudad: cf.city || null });
}
