# Publicar la página en Cloudflare Pages (gratis)

Build: `npm run build` · Carpeta de salida: `dist` · Raíz: (vacía)

Variables (Settings → Variables and Secrets), para Production:
- VITE_SUPABASE_URL = https://ywxyncoqquttrbtvlpex.supabase.co
- VITE_SUPABASE_ANON_KEY = (la misma que estaba en Railway)
- R2_PUBLIC_URL = https://pub-b321ba42fdc7440d996e72f8df545eaf.r2.dev
- GEMINI_API_KEY = (secreto, para "Mejorar con IA")

Bindings (Settings → Bindings): R2 bucket · nombre de variable `FOTOS` · bucket `mueble-zulia`.

Las funciones del servidor están en `functions/api/` (subir fotos, proxy de fotos, ubicación, IA).
`server.js` queda solo por si se vuelve a Railway.
