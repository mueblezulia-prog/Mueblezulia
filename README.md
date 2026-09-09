# Mueble Zulia — Guía de despliegue

Estructura del proyecto:

```
mueble-zulia/
├── public/
│   ├── index.html
│   ├── catalogo.html
│   ├── carrito.html
│   ├── checkout.html
│   ├── confirmacion.html
│   ├── style.css
│   └── script.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── supabase.sql
```

---

## 1. Crear la carpeta y subir a GitHub

```bash
# Descomprime/copia el proyecto en tu computador, entra a la carpeta
cd mueble-zulia

git init
git add .
git commit -m "Primer commit: sitio Mueble Zulia"

# Crea un repositorio vacío en https://github.com/new (sin README)
# Luego conecta tu carpeta local a ese repo:
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mueble-zulia.git
git push -u origin main
```

---

## 2. Supabase (base de datos)

1. Entra a https://supabase.com y crea un proyecto nuevo (gratis).
2. Ve a **SQL Editor** → **New query**, pega el contenido de `supabase.sql` y ejecuta (`Run`). Esto crea la tabla `pedidos`.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → será tu `SUPABASE_URL`
   - **anon public key** (o `service_role` si quieres permisos completos desde el backend) → será tu `SUPABASE_KEY`

Guarda estos dos valores, los usarás en Railway en el paso 4.

---

## 3. Railway (alojamiento del backend + sitio)

1. Entra a https://railway.app y haz login con tu cuenta de GitHub.
2. Click en **New Project → Deploy from GitHub repo** y selecciona `mueble-zulia`.
3. Railway detecta `package.json` y usará automáticamente `npm start` (que corre `server.js`).
4. Ve a la pestaña **Variables** del servicio y añade:
   - `SUPABASE_URL` = (el que copiaste de Supabase)
   - `SUPABASE_KEY` = (el que copiaste de Supabase)
   - (opcional) `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` si quieres notificaciones por Telegram
5. Ve a **Settings → Networking → Generate Domain** para obtener una URL pública tipo `mueble-zulia.up.railway.app`.
6. Abre esa URL: deberías ver el sitio funcionando y los pedidos guardándose en Supabase.

---

## 4. Cloudflare (dominio propio y seguridad)

Solo si quieres usar un dominio propio (ej. `muebleszulia.com`) en vez de la URL de Railway:

1. Compra o transfiere tu dominio a Cloudflare (o solo cambia los **nameservers** del dominio a los que Cloudflare te indique).
2. En Cloudflare, ve a **DNS** y crea un registro:
   - Tipo: `CNAME`
   - Nombre: `@` o `www`
   - Destino: la URL que te dio Railway (ej. `mueble-zulia.up.railway.app`)
   - Proxy status: activado (nube naranja) — esto da SSL y protección automática.
3. En Railway, ve a **Settings → Networking → Custom Domain** y añade tu dominio (ej. `www.muebleszulia.com`). Railway te dará un valor de verificación (CNAME) — asegúrate que coincida con lo que pusiste en Cloudflare.
4. Espera unos minutos a que se propague el DNS. Ya tu sitio estará en tu dominio, con SSL y protegido por Cloudflare.

---

## 5. Notas importantes

- El número de WhatsApp para "Consultar personalización" está en `public/script.js`, variable `WHATSAPP_NUM`. Cámbialo por el número real de Mueble Zulia (formato: código de país + número, sin espacios ni +).
- Las imágenes de los productos usan un marcador de posición (`placehold.co`). Sustitúyelas por fotos reales subiendo las imágenes a `public/` y cambiando las rutas en `script.js`.
- Cada vez que hagas cambios: `git add . && git commit -m "cambios" && git push`. Railway vuelve a desplegar automáticamente.
- El precio, catálogo y textos son de ejemplo — edítalos en `public/script.js` (arreglo `PRODUCTOS`) y en los HTML.
