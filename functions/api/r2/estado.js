import { json, publicaR2 } from "../../../cf/comun.js";
export const onRequestGet = ({ env }) => json({ ok: true, activo: !!(env.FOTOS && publicaR2(env)) });
