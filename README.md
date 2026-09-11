# Mueble Zulia — Fase 1 (Catálogo, Detalle y Panel Admin)

Entregable de la Fase 1: catálogo mobile-first, vista de detalle de producto
con selector de color, y el UI del panel de administrador con recorte de
imagen (Crop & Scale) y previsualización exacta del catálogo.

Construido con **React + Vite + Tailwind CSS + Supabase**, validado con
`npm run build` y probado visualmente (capturas de escritorio y móvil,
interacción real con el recortador, agregar variantes y abrir la
previsualización).

## Estructura

```
src/
  components/
    ProductCard.jsx           # tarjeta de catálogo (cliente)
    ColorSwatchSelector.jsx   # círculos de color en el detalle
  pages/
    Catalogo.jsx               # grid de productos (cliente)
    ProductoDetalle.jsx        # vista de un producto
  admin/
    ProductForm.jsx            # formulario de alta/edición
    ImageCropModule.jsx        # recorte y zoom (react-easy-crop)
    VariantManager.jsx         # alta de colores (nombre + HEX)
    PreviewModal.jsx           # reutiliza ProductCard para "ver antes de guardar"
  lib/
    supabaseClient.js
    cropImage.js                # genera el JPEG recortado en el navegador (canvas)
supabase/
  schema.sql                    # tablas, índices, RLS, bucket de Storage
```

## Cómo correrlo

```bash
npm install
cp .env.example .env   # completar con tu URL y anon key de Supabase
npm run dev
```

`npm run build` genera la versión de producción en `dist/`.

## Paleta y accesibilidad (45+)

Definida como tokens estáticos en `tailwind.config.js` — **nunca** se
extraen colores de las fotos de los muebles:

- Fondo: `carbon` `#1E1E1E` / superficies `carbon-light` `#2A2A2A`
- Acento principal: `gold` `#F2B90C`
- Texto: blanco / `ink-muted` `#8C8C8C` para descripciones
- Tamaño de texto base 16px (nunca menor), objetivo táctil mínimo de 48px
  (`min-h-tap`) en todos los botones y controles

Estos mismos valores (`#1E1E1E`, `#F2B90C`, `#8C8C8C`, `#C1440E`) ya se usan
en el sitio actual (`mueble-zulia/public/style.css`), así que la marca se
mantiene consistente entre ambos.

## Decisión de diseño: cómo se guarda el recorte de imagen

Cada producto guarda **dos imágenes + un JSON de recorte**:

1. `imagen_original_url` — la foto tal cual la subió el administrador, sin
   tocar. Se conserva para poder reabrir el editor más adelante y ajustar
   el encuadre sin perder calidad ni volver a pedir la foto.
2. `crop_data` (jsonb) — los parámetros que entrega `react-easy-crop`:
   `{ croppedAreaPixels: {x, y, width, height}, aspecto }`. Es la
   "receta" del recorte, no la imagen en sí.
3. `imagen_recortada_url` — el resultado final: un JPEG generado en el
   navegador con `<canvas>` (ver `src/lib/cropImage.js`) a partir de
   `imagen_original_url` + `crop_data`, y subido a Supabase Storage.

**El catálogo y el detalle de producto solo consumen
`imagen_recortada_url`** — nunca calculan recortes ni aplican
`object-fit`/`aspect-ratio` forzado. Por eso las tarjetas "adaptan
dinámicamente su altura al formato de la foto": el `<img>` se muestra con
su proporción natural (`w-full h-auto`), que es exactamente la proporción
que el admin eligió en el paso de recorte.

Ventaja de este enfoque frente a guardar solo coordenadas y recortar con
CSS en el cliente: el cliente descarga una imagen ya del tamaño correcto
(más liviana, sin recalcular nada), y el admin puede volver a
generar el recorte en el futuro (por ejemplo si se sube una foto de mayor
resolución) sin perder el encuadre que ya había definido.

## Desplegar en Railway (sin usar tu computadora)

Este proyecto es una carpeta aparte del sitio actual — se despliega como
un **segundo servicio** dentro del mismo proyecto de Railway (o en uno
nuevo, como prefieras). No necesitas correr `npm run dev` ni tener nada
abierto en tu computadora una vez desplegado.

1. Sube esta carpeta (`mz-react/`) a tu repositorio de GitHub (puede ser
   el mismo repo del sitio actual, como una carpeta más, o un repo nuevo
   — cualquiera funciona).
2. En Railway: **New** → **GitHub Repo** → selecciona el repositorio.
3. Si subiste esta carpeta dentro del mismo repo del sitio actual: en
   **Settings → Source → Add Root Directory**, escribe `mz-react`
   (o el nombre que le hayas puesto a la carpeta) para que Railway sepa
   que debe construir y correr SOLO esa carpeta, no el sitio viejo.
4. En **Variables**, añade:
   - `VITE_SUPABASE_URL` = la URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave pública (anon key) de Supabase
5. Railway detecta `package.json`, corre `npm install`, luego
   `npm run build` (genera `dist/`) y luego `npm start` (el `server.js`
   de este proyecto, que sirve esos archivos). No hace falta que
   configures nada de esto a mano — ya está en el `package.json`.
6. **Settings → Networking → Generate Domain** para obtener la URL
   pública de esta versión (será distinta a la del sitio actual, ya que
   es un servicio separado).

**Importante sobre las variables `VITE_...`:** a diferencia de las
variables del sitio actual (`SUPABASE_URL`, `SUPABASE_KEY`), estas deben
llevar el prefijo `VITE_` tal cual, porque Vite las "hornea" dentro del
código durante el paso de `build` — si les cambias el nombre, la app no
va a encontrar tu Supabase.

## Pendiente para producción (no bloquea la Fase 1)

- **Autenticación del panel admin**: `schema.sql` deja las tablas
  `productos` y `producto_colores` con RLS que solo permite escritura a
  `service_role`. Como el formulario de este entregable escribe
  directamente desde el navegador con la clave pública (`anon key`), en
  producción hay que elegir una de estas dos rutas:
  1. Autenticar al admin con Supabase Auth y ajustar la policy para
     validar `auth.uid()` contra una tabla de administradores, o
  2. Reutilizar el backend Express ya existente en el sitio actual
     (`server.js`, que ya tiene `requireAdmin`) como intermediario: el
     panel llama a `/api/admin/productos` en vez de a Supabase
     directamente, igual que ya hace hoy con categorías y productos.
     Esta es la opción recomendada por consistencia con lo ya construido.
- Conectar los botones "Comprar Ahora" / "Compra Personalizada" al flujo
  de carrito/checkout existente (por ahora son placeholders con
  `console.log`, listos para cablear en la Fase 2).
- Subir la imagen original en background/redimensionada si se esperan
  fotos muy pesadas (móviles modernos suben 8-12MB por foto).
