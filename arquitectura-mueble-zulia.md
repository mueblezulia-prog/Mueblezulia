# Mueble Zulia — Estado del proyecto

_Actualizado: 3 de octubre de 2026_

Ecosistema digital de **Muebles Zulia Premiun E&Z** (Maracaibo): una página web pública (catálogo) y una app de gestión instalable en el teléfono (ventas, abonos, cobranza, caja, inventario). Las dos comparten **la misma base de datos** y los mismos usuarios.

---

## 1. Arquitectura actual

```
                    ┌──────────────────────────────┐
  Clientes  ──────▶ │  PÁGINA WEB (repo "mueble-zulia")   │  Railway · mueblezulia-production.up.railway.app
                    │  React + Vite + Tailwind      │  catálogo, telas, contacto, ubicación
                    │  Panel /admin (catálogo y     │
                    │  contenido de la página)      │
                    │  Express (server.js)          │  sirve dist/ + /api/geo + /api/mejorar-descripcion
                    └──────────────┬───────────────┘
                                   │  supabase-js (anon key + sesión del usuario)
                                   ▼
                    ┌──────────────────────────────┐
                    │  SUPABASE (un solo proyecto)  │
                    │  Postgres + RLS por permiso   │  tablas, vistas y funciones mz_*
                    │  Auth (usuario@mueblezulia.app)│
                    │  Storage (fotos de muebles)   │
                    └──────────────▲───────────────┘
                                   │
                    ┌──────────────┴───────────────┐
  Dueño y   ──────▶ │  APP DE GESTIÓN (repo "mueble-zulia-app") │  Railway (servicio aparte)
  trabajadores      │  PWA instalable (Android/iOS) │  ventas, cobranza, caja, inventario,
                    │  React + Vite + Tailwind      │  clientes, recibos PDF, tablero,
                    │  Express (server.js)          │  + copia de las pantallas del panel web
                    └──────────────────────────────┘
```

**Frontend.** Dos SPA en React. La página usa `src/pages` y `src/components`, y el panel está en `src/admin`. La app usa `src/app` (marco, menú, inicio), `src/ventas` (módulos de negocio) y `src/admin` (pantallas compartidas con el panel web).

**Backend.** No hay una API propia para el negocio: el navegador habla directo con Supabase. Lo sensible (permisos, cálculos de dinero, validaciones) vive **dentro de Postgres** con RLS y funciones `security definer`. Los `server.js` de Express solo sirven el sitio compilado y hacen de proxy a Gemini para "✨ Mejorar con IA".

**Base de datos.** Supabase (Postgres). Los cambios se aplican con archivos `supabase/fase_1_NN_*.sql`, que se pegan a mano en el SQL Editor.

---

## 2. Features completadas ✅

### Página web
- ✅ Catálogo por categorías y subcategorías, ficha de producto, filtro de entrega inmediata
- ✅ Catálogo de telas por familia, con colores, disponibilidad, beneficios y zoom
- ✅ Contenido editable: portada, bloques de inicio, fabricación, opiniones de clientes
- ✅ Contacto, ubicación con mapa y horario, métodos de pago, botón flotante de WhatsApp
- ✅ Estadísticas de visitas propias (sin Google Analytics)
- ✅ Panel `/admin`: muebles (con recorte de foto y HEIC), categorías, telas, etiquetas, contenido, opiniones, estadísticas y usuarios
- ✅ "✨ Mejorar con IA" para descripciones de muebles (Gemini, desde el servidor)

### Usuarios y permisos
- ✅ Usuarios por nombre (`usuario@mueblezulia.app`), creados desde el panel
- ✅ Roles: Dueño, Vendedor, Taller, Página web, Personalizado
- ✅ Permisos: `pedidos`, `dinero`, `clientes`, `inventario`, `finanzas`, `catalogo`, `contenido`, `estadisticas`, `usuarios`
- ✅ Protección real en la base de datos (RLS con `mz_puede()`), no solo en pantalla

### App de gestión
- ✅ PWA instalable (manifest, service worker, íconos, instrucciones para Android e iPhone)
- ✅ Menú abajo en el teléfono y lateral en PC, distinto según el rol
- ✅ **Ventas (facturación mixta):** muebles de la tienda, del catálogo o a medida (con descripción)
- ✅ **Tipos de venta:** contado (pago completo), apartado (mínimo 35%, 2 meses), crédito (sin mínimo, 2 meses, se entrega al pagar)
- ✅ **Búsqueda de cliente por cédula/RIF**, que lo autocompleta; si no existe, se registra en la misma pantalla
- ✅ **Abonos en varias partes** ($ y Bs), con tasa euro o dólar BCV y equivalente en $; la referencia es opcional
- ✅ **Recibo numerado automático** por cada abono, en PDF igual al talonario de papel; se comparte por WhatsApp o se imprime
- ✅ Nota de venta en PDF con todos los abonos
- ✅ Anular abonos (solo el dueño, con motivo; no se borran)
- ✅ No se entrega con deuda, salvo autorización del dueño ("Entregado – con deuda")
- ✅ **Cobranza:** semáforo (vencido / por vencer / al día), recordatorio por WhatsApp con mensaje listo y registro de avisos
- ✅ **Caja del día:** lo cobrado por método contra lo contado, diferencias, "hoy no se vendió nada" y los últimos 14 días
- ✅ **Inventario:** en tienda / apartado / disponible, entradas, conteo opcional con ajuste, historial y costo privado
- ✅ Salida automática del inventario al marcar "Entregado"
- ✅ **Tablero del dueño:** vendido, cobrado y por cobrar del mes, comparación con el mes anterior, calendario de días con venta, 12 meses y cobrado por método
- ✅ Tasa BCV del día (euro y dólar), anotada una vez al día
- ✅ "Mi negocio": datos del encabezado de los recibos y reglas (35%, 2 meses, días de aviso, tasa preferida)
- ✅ Clientes, pedidos para el taller (sin precios) y recibos sueltos hechos a mano

---

## 3. Features en progreso 🔄

| Feature | Estado |
|---|---|
| 🔄 Puesta en producción de la app y la página nueva | Código entregado; falta subir los repos y correr los SQL `1_20` a `1_23` y el arreglo de permisos |
| 🔄 Cloudflare R2 para fotos | La cuenta existe pero no está activada. Hoy las fotos siguen en Supabase Storage |
| 🔄 APK para Android | Opcional. Se instala desde Chrome; si hace falta un APK, se genera con PWABuilder después de publicar |
| ⏸️ Materiales del taller (madera, tela, espuma) | Pospuesto por el dueño; por ahora el inventario es solo de muebles terminados |
| ⏸️ Bot de WhatsApp automático | Pospuesto; necesita WhatsApp Business API |
| ⏸️ Comisiones de vendedores | No aplica por ahora. Las ventas por vendedor se calculan pero no se muestran |

---

## 4. Bugs / issues pendientes

| # | Problema | Gravedad | Qué hacer |
|---|---|---|---|
| 1 | "No tienes permiso" al guardar clientes. La `1_21` se corrió antes que la `1_20` y las tablas quedaron sin reglas | 🔴 Alta | Correr `supabase/arreglo_permisos_clientes.sql` en el SQL Editor (pegar **el contenido del archivo**, no la dirección de la app) |
| 2 | `server.js` de la página conserva endpoints viejos sin uso: `/api/admin/*` con `ADMIN_PASSWORD` y `/api/pedido`, que es público y escribe en `pedidos` con el formato viejo | 🟠 Media | Borrarlos y dejar solo `/api/geo`, `/api/mejorar-descripcion` y `/health`. Revisar si `SUPABASE_KEY` en Railway es la *service role* |
| 3 | No hay pruebas automáticas. Todo se probó con una vista previa simulada y un Postgres local, no con el Supabase real ni en un teléfono real | 🟠 Media | Probar el flujo completo en producción: venta → abono → recibo → entrega |
| 4 | Las pantallas compartidas (panel web ↔ app) se copian a mano con `sync_app.py`, que no está en el repo; pueden quedar distintas | 🟡 Baja | Mover lo compartido a un paquete común o añadir el script al repo |
| 5 | El editor de pedidos del taller borra y vuelve a insertar los renglones al guardar (conserva inventario y detalle; no toca abonos) | 🟡 Baja | Pasarlo a una función `mz_` como las ventas |
| 6 | El precio de venta del inventario llega al rol Taller por la vista (solo se oculta en pantalla) | 🟡 Baja | Separar el precio o filtrarlo en la vista por permiso |
| 7 | El PDF usa Helvetica, no Inter (la fuente de la página) | 🟢 Cosmético | Incrustar Inter en el generador de PDF si se quiere igual |
| 8 | Compartir el PDF directo a WhatsApp solo funciona en el teléfono; en PC se descarga | 🟢 Esperado | — |
| 9 | La tasa BCV se anota a mano | 🟢 Mejora | Leerla sola de una fuente confiable desde el servidor |
| 10 | Puede existir la tabla `pedidos_web_antiguo` (datos del formulario viejo, guardados al migrar) | 🟢 Info | Revisarla y borrarla si no sirve |

---

## 5. Decisiones técnicas importantes

1. **Dos proyectos, una base de datos.** La página y la app se despliegan por separado (dos repos, dos servicios en Railway) pero comparten Supabase, usuarios y datos.
2. **La seguridad vive en Postgres.** Toda tabla tiene RLS. `mz_puede(permiso)` y `mz_es_dueno()` deciden el acceso; la interfaz solo oculta botones. Siempre queda al menos un dueño activo.
3. **Venta = tabla `pedidos`.** No hay una tabla "facturas" paralela. `estado` es producción/entrega; el estado de pago se calcula (`ventas_resumen`).
4. **El dinero se guarda en US$.** Cada parte en Bs guarda el monto en Bs, la tasa usada (euro, dólar u otra) y su equivalente en $. El negocio cobra el dólar a **tasa euro BCV**.
5. **Los abonos no se borran, se anulan,** con motivo, por quién y cuándo. Cada abono tiene un `grupo_id` para sus partes y su propio recibo.
6. **Los recibos son una "foto" fija:** cliente, renglones y montos de ese momento. Si después cambia un precio o un cliente, el recibo no cambia.
7. **Comprobante interno, no factura fiscal.** Sin IVA (igual que el talonario) y sin número de control del SENIAT.
8. **Operaciones de dinero atómicas.** `mz_guardar_venta`, `mz_registrar_abono` y `mz_anular_abono` validan y guardan todo o nada (stock, contado completo, mínimo del apartado, abono que no pase lo que resta).
9. **El stock se calcula, no se escribe:** físico = suma de movimientos; apartado = lo vendido sin entregar; disponible = físico − apartado. La salida se registra sola al entregar.
10. **PDF propio, sin librerías** (`src/lib/pdf.js`, unos 14 KB por documento) y Web Share API para mandarlo a WhatsApp. Se eligió así porque no se podían instalar paquetes nuevos de npm.
11. **PWA en vez de app de tienda:** se instala desde el navegador y se actualiza sola con cada despliegue.
12. **SQL manual e idempotente.** Cada cambio es un archivo que se puede correr varias veces sin daño, con guardas que verifican las fases previas. Nunca se toca la base de datos con herramientas automáticas: el dueño pega el archivo en *su* SQL Editor.
13. **Reglas del negocio configurables** en `negocio_datos`: 35%, 2 meses, días de aviso, tasa preferida. Cada venta copia la regla vigente al crearse.
14. **Colores de gráficos validados** para daltonismo sobre el fondo oscuro: vendido `#c98500`, cobrado `#3987e5`.

---

## 6. Stack actual

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React / React DOM | ^18.3.1 |
| Rutas | react-router-dom | ^6.26.2 |
| Build | Vite + @vitejs/plugin-react | ^5.4.8 / ^4.3.1 |
| Estilos | Tailwind CSS + PostCSS + Autoprefixer | ^3.4.13 / ^8.4.47 / ^10.4.20 |
| Servidor | Node.js + Express | ≥18 / ^4.19.2 |
| Datos | @supabase/supabase-js | ^2.45.0 |
| Fotos | react-easy-crop, heic2any, multer (página) | ^5.0.8 / ^0.0.4 / ^1.4.5-lts.1 |
| Compatibilidad | `ws` (WebSocket para Node 18 en Railway, solo página) | ^8.18.0 |
| Base de datos | Supabase Postgres (RLS, vistas, PL/pgSQL), Auth, Storage | — |
| IA | Gemini API (vía servidor, `GEMINI_API_KEY`) | — |
| Hosting | Railway (2 servicios), GitHub (2 repos) | — |
| Fuente | Inter (Google Fonts) | — |

**Variables de entorno.** Las dos apps usan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `GEMINI_API_KEY` (opcional). La página además usa `VITE_URL_APP`, y la app `VITE_URL_WEB`.

---

## 7. Base de datos: archivos SQL (orden)

```
fase_1_10 … 1_15   telas, videos, fotos (ya aplicados)
fase_1_16          opiniones y estadísticas
fase_1_18          usuarios del panel
fase_1_19          beneficios y zoom de telas
fase_1_20          clientes, pedidos, renglones, pagos
fase_1_21          roles y permisos (reemplaza a 1_17)
fase_1_22          recibos y datos del negocio
fase_1_23          ventas (contado/apartado/crédito), abonos, tasa, cobranza,
                   caja, inventario, tablero, permiso "finanzas"
arreglo_permisos_clientes.sql   repara reglas si 1_21 corrió antes que 1_20
```

**Funciones públicas:** `mz_puede`, `mz_es_dueno`, `mz_mi_perfil`, `admin_*` (usuarios), `mz_buscar_cliente_documento`, `mz_guardar_venta`, `mz_registrar_abono`, `mz_anular_abono`, `mz_caja_dia`, `mz_tablero`.
**Vistas:** `ventas_resumen`, `inventario_stock`.

---

## 8. Próximos pasos

1. **Correr `arreglo_permisos_clientes.sql`** y comprobar que el usuario dueño aparece con rol `dueno`.
2. Correr `fase_1_22` y `fase_1_23` (si faltan).
3. Subir el zip de la página a su repo y el de la app a un repo nuevo; crear el servicio en Railway con sus variables.
4. Instalar la app en los teléfonos (Chrome → "Instalar aplicación") y crear los usuarios de los vendedores.
5. Probar en producción: venta con apartado → abono en $ y Bs → recibo por WhatsApp → entrega → caja del día.
6. Limpiar los endpoints viejos de `server.js` de la página (issue 2).
7. Activar Cloudflare R2 y pasar la subida de fotos a URLs prefirmadas desde el servidor.
8. Definir el inventario de materiales del taller.
9. Más adelante: tasa BCV automática, bot de WhatsApp, APK con PWABuilder si hace falta.

---

## 9. Convenciones de código

**Idioma y nombres**
- Todo en español: variables, funciones, componentes, textos y comentarios (`cargarVenta`, `mensajeErrorVentas`, `ElegirCliente`).
- Componentes y pantallas en `PascalCase.jsx`; utilidades en `src/lib/*.js` en camelCase.
- Funciones SQL públicas con prefijo `mz_`, internas con `_mz_`. Archivos SQL: `fase_1_NN_tema.sql`.

**Interfaz**
- Tema oscuro de marca: `carbon` (#1E1E1E), `carbon-light`, `carbon-border`, `gold` (#F2B90C), `ink`, `ink-muted`, `terracota`.
- Clases comunes: `admin-card`, `campo-input`, `btn-admin-primary|secondary|ghost|danger`, `esqueleto`, `contenedor`.
- Pensado para usuarios de 45 años o más: texto de lectura ≥16 px y botones de al menos 44 px de alto (`min-h-tap`).
- Primero el teléfono (*mobile-first*); en computador, menú lateral (`lg:`).
- El estado nunca se indica solo con color: siempre ícono + texto (🔴 Vencido, 🟡 Por vencer…).
- Mensajes de error en español y entendibles (`mensajeErrorCRM`, `mensajeErrorVentas`, `mensajeErrorRecibos`), nunca el error técnico crudo.

**Datos y seguridad**
- Nada sensible se decide solo en el frontend: cada regla también está en RLS o en una función `mz_`.
- Operaciones de varias tablas → una función `mz_` atómica, no varias llamadas sueltas.
- Montos con 2 decimales, en US$; los Bs siempre van acompañados de la tasa.
- Los SQL nuevos deben poder correrse dos veces (`if not exists`, `create or replace`, `drop policy if exists`) y verificar las fases que necesitan.

**Entrega y despliegue**
- Los cambios se entregan en un zip con las rutas exactas del repo; el dueño los sube a GitHub y Railway publica solo.
- Si se cambia una pantalla compartida en `src/admin` de la página, hay que copiarla también a la app (cambiando `/admin/...` por `/...`).
- Antes de entregar: compilar, probar en la vista previa (teléfono y PC, por rol) y correr el SQL en un Postgres de prueba.
