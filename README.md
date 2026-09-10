# Mueble Zulia — Sitio web + Panel de Administración

## Cómo está armado el proyecto (explicación técnica en simple)

Este proyecto tiene dos partes que trabajan juntas:

1. **El sitio que ve el cliente** (`public/`): son archivos HTML/CSS/JS normales.
   Cada página (`index.html`, `catalogo.html`, `fabricacion.html`, `carrito.html`,
   `checkout.html`) es solo texto que el navegador dibuja. `style.css` tiene todos
   los colores y tipografía de tu marca. `script.js` tiene la lógica: el carrito,
   el modal de personalización, y pedir los muebles al servidor.

2. **El servidor** (`server.js`): es un programa en Node.js que corre en Railway
   las 24 horas. Hace dos cosas:
   - Sirve los archivos de `public/` cuando alguien visita el sitio.
   - Atiende "peticiones" del navegador: cuando alguien confirma un pedido
     (`/api/pedido`), o cuando el catálogo pide la lista de muebles
     (`/api/productos`), o cuando tú, desde el panel admin, añades/editas/borras
     un mueble (`/api/admin/productos`).

3. **Supabase** es la base de datos. Tiene dos tablas:
   - `pedidos`: cada compra que hace un cliente.
   - `productos`: cada mueble de tu catálogo (nombre, categoría, precio, imagen).
     El catálogo del sitio (`catalogo.html`) YA NO tiene los muebles escritos
     en el código — los pide a Supabase a través del servidor. Por eso, cuando
     subes un mueble desde el panel admin, aparece automáticamente en el catálogo.

**Flujo cuando subes un mueble nuevo:**
`Tú en /admin.html` → `server.js (/api/admin/productos)` → `se guarda en Supabase (tabla productos)` → `catalogo.html lo pide y lo muestra`

**Flujo cuando un cliente compra:**
`Cliente en checkout.html` → `server.js (/api/pedido)` → `se guarda en Supabase (tabla pedidos)` → `(opcional) te llega una notificación por Telegram`

---

## Estructura de archivos

```
mueble-zulia/
├── public/
│   ├── index.html         → página principal (hero, categorías, sede, manufactura)
│   ├── catalogo.html      → catálogo agrupado por categoría (viene de Supabase)
│   ├── fabricacion.html   → proceso de fabricación y materiales
│   ├── carrito.html
│   ├── checkout.html
│   ├── confirmacion.html
│   ├── admin.html         → panel de administración (login + gestión de muebles)
│   ├── admin.js
│   ├── style.css          → colores y tipografía de la marca
│   ├── script.js
│   └── img/
│       ├── logo.png
│       └── fachada.png
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── supabase.sql
```

---

## 1. Supabase — actualizar la base de datos

Como ya tenías la tabla `pedidos`, ahora falta crear la tabla `productos`:

1. Entra a tu proyecto en https://supabase.com
2. **SQL Editor → New query**, pega el contenido de `supabase.sql` (ya incluye
   ambas tablas, y usa `create table if not exists`, así que no rompe nada si
   `pedidos` ya existía) → **Run**.

---

## 2. Railway — nueva variable de entorno

El panel de administración se protege con una contraseña simple. Añádela en
Railway junto a las que ya tienes:

1. Servicio → pestaña **Variables** → **New Variable**
2. `ADMIN_PASSWORD` = elige una contraseña segura (esta es la que usarás para
   entrar a `tu-sitio.up.railway.app/admin.html`)
3. Guarda — Railway reinicia el servicio automáticamente.

Recuerda que ya deberías tener configuradas: `SUPABASE_URL`, `SUPABASE_KEY`.

---

## 3. Subir los cambios a GitHub

```bash
git add .
git commit -m "Rediseño con marca real + panel de administración"
git push
```

Railway detecta el push y despliega automáticamente.

---

## 4. Usar el panel de administración

1. Ve a `https://tu-sitio.up.railway.app/admin.html`
2. Entra con la contraseña que pusiste en `ADMIN_PASSWORD`
3. El panel tiene 3 pestañas:
   - **📊 Estadísticas**: pedidos totales, ventas totales, ticket promedio,
     muebles más vendidos y ventas de los últimos 7 días — todo calculado
     en vivo desde la tabla `pedidos` de Supabase.
   - **🛋️ Muebles**: añade, edita o borra muebles del catálogo (nombre,
     categoría, descripción, precio, imagen).
   - **🗂️ Categorías**: crea tus propias secciones del catálogo (nombre,
     slug y orden de aparición) — ya no están fijas en el código. El "slug"
     es el identificador interno (sin espacios ni acentos, ej: `sillones-reclinables`)
     que conecta cada mueble con su categoría.

**Sobre las imágenes:** por ahora el panel pide una *URL* de imagen (por ejemplo,
subes la foto a Google Drive, Imgur, o cualquier servicio de imágenes, la haces
pública, y pegas ese link). Si más adelante quieres subir la foto directo desde
tu computadora sin usar un link externo, se puede añadir soporte para eso —
dime cuando quieras esa mejora.

---

## 5. Categorías

Las categorías ya NO están fijas en el código — se crean, editan y borran desde
la pestaña **🗂️ Categorías** del panel admin, y se guardan en la tabla
`categorias` de Supabase (que ya viene con las 6 categorías iniciales: Modulares,
Comedores, Dormitorios, Mesa de Centro, Colección de Reflejos, Mueble TV).

---

## 6. Pendientes / cosas a definir

- **Número de WhatsApp real**: está en `public/script.js` (`WHATSAPP_NUM`) y en
  `fabricacion.html`. Cámbialo por el número real de la tienda.
- **Mapa de la sede**: hay un recuadro de marcador de posición en `index.html`
  (sección "Nuestra Sede"). Cuando me pases el link de Google Maps de tu local,
  lo integro.
- **Redes sociales**: los enlaces de Instagram/Facebook en el footer están vacíos
  (`href="#"`) — pásame los links reales para completarlos.
- **Fotos reales del taller**: la sección de Fabricación usa marcadores de
  posición para "Diseño", "Corte", "Tapizado", "Control de calidad" — si me
  pasas fotos reales del proceso, las integro.
