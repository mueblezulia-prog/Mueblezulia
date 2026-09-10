// Mueble Zulia — lógica de front-end
// Categorías y productos se piden a la API (guardados en Supabase por el panel admin).
// Si el backend no responde, se usa un catálogo/categorías de ejemplo.

const CATEGORIAS_EJEMPLO = [
  { slug: "modulares", nombre: "Modulares" },
  { slug: "comedores", nombre: "Comedores" },
  { slug: "dormitorios", nombre: "Dormitorios" },
  { slug: "mesa-centro", nombre: "Mesa de Centro" },
  { slug: "reflejos", nombre: "Colección de Reflejos" },
  { slug: "mueble-tv", nombre: "Mueble TV" },
];

const PRODUCTOS_EJEMPLO = [
  { id: "sofa-x", nombre: "Sofá Zulia Confort", categoria: "modulares", descripcion: "Sofá de 3 puestos, tapizado premium.", precio: 480, imagen: "" },
  { id: "mesa-y", nombre: "Mesa Comedor Roble", categoria: "comedores", descripcion: "Mesa para 6 personas en madera de roble.", precio: 350, imagen: "" },
  { id: "cama-z", nombre: "Cama Matrimonial Nova", categoria: "dormitorios", descripcion: "Cama tapizada con cabecero acolchado.", precio: 300, imagen: "" },
  { id: "centro-w", nombre: "Mesa de Centro Mármol", categoria: "mesa-centro", descripcion: "Base metálica, tope de mármol.", precio: 180, imagen: "" },
  { id: "reflejo-v", nombre: "Puerta Colección Reflejos", categoria: "reflejos", descripcion: "Acabado espejado con marco decorativo.", precio: 220, imagen: "" },
  { id: "tv-u", nombre: "Mueble TV Line", categoria: "mueble-tv", descripcion: "Mueble suspendido con luz LED integrada.", precio: 260, imagen: "" },
];

const WHATSAPP_NUM = "584127519141"; // Mueble Zulia

let PRODUCTOS = [];
let CATEGORIAS = [];
let CONFIG = {};

async function cargarConfiguracion() {
  try {
    const res = await fetch("/api/configuracion");
    CONFIG = await res.json();
  } catch (err) {
    console.warn("No se pudo cargar /api/configuracion.", err);
    CONFIG = {};
  }
  aplicarConfiguracion();
}

function aplicarConfiguracion() {
  const whatsappHref = CONFIG.whatsapp_url || `https://wa.me/${WHATSAPP_NUM}`;

  document.querySelectorAll("[data-config='telefono']").forEach(el => { el.textContent = CONFIG.telefono || el.textContent; });
  document.querySelectorAll("[data-config='direccion']").forEach(el => { el.textContent = CONFIG.direccion || el.textContent; });
  document.querySelectorAll("[data-config='maps-url']").forEach(el => { el.href = CONFIG.google_maps_url || el.href; });
  document.querySelectorAll("[data-config='instagram-url']").forEach(el => { el.href = CONFIG.instagram_url || el.href; });
  document.querySelectorAll("[data-config='tiktok-url']").forEach(el => { el.href = CONFIG.tiktok_url || el.href; });
  document.querySelectorAll("[data-config='whatsapp-url']").forEach(el => { el.href = whatsappHref; });

  // Botón flotante de WhatsApp (se agrega una sola vez por página)
  if (!document.getElementById("whatsapp-float")) {
    const btn = document.createElement("a");
    btn.id = "whatsapp-float";
    btn.href = whatsappHref;
    btn.target = "_blank";
    btn.className = "whatsapp-float";
    btn.innerHTML = "💬";
    btn.title = "Escríbenos por WhatsApp";
    document.body.appendChild(btn);
  }
}

async function cargarCategorias() {
  try {
    const res = await fetch("/api/categorias");
    if (!res.ok) throw new Error("sin respuesta");
    CATEGORIAS = await res.json();
    if (!Array.isArray(CATEGORIAS) || CATEGORIAS.length === 0) CATEGORIAS = CATEGORIAS_EJEMPLO;
  } catch (err) {
    console.warn("No se pudo cargar /api/categorias, usando categorías de ejemplo.", err);
    CATEGORIAS = CATEGORIAS_EJEMPLO;
  }
}

async function cargarProductos() {
  try {
    const res = await fetch("/api/productos");
    if (!res.ok) throw new Error("sin respuesta");
    PRODUCTOS = await res.json();
    if (!Array.isArray(PRODUCTOS) || PRODUCTOS.length === 0) PRODUCTOS = PRODUCTOS_EJEMPLO;
  } catch (err) {
    console.warn("No se pudo cargar /api/productos, usando catálogo de ejemplo.", err);
    PRODUCTOS = PRODUCTOS_EJEMPLO;
  }
}

function getCart() { return JSON.parse(localStorage.getItem("mz_cart") || "[]"); }
function saveCart(cart) { localStorage.setItem("mz_cart", JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = getCart().length;
}

function addStandardToCart(id) {
  const producto = PRODUCTOS.find(p => String(p.id) === String(id));
  if (!producto) return;
  const cart = getCart();
  cart.push({ ...producto, personalizado: false });
  saveCart(cart);
  alert(`${producto.nombre} añadido al carrito.`);
}

function openCustomModal(id) {
  const producto = PRODUCTOS.find(p => String(p.id) === String(id));
  if (!producto) return;
  const overlay = document.getElementById("custom-modal");
  overlay.dataset.productId = id;
  document.getElementById("custom-modal-title").textContent = `Personaliza tu ${producto.nombre}`;
  overlay.classList.add("active");
  const mensaje = encodeURIComponent(`Hola, quiero consultar la personalización del ${producto.nombre} (medidas a la medida).`);
  document.getElementById("whatsapp-consulta").href = `https://wa.me/${WHATSAPP_NUM}?text=${mensaje}`;
}

function closeCustomModal() { document.getElementById("custom-modal").classList.remove("active"); }

function addCustomToCart() {
  const overlay = document.getElementById("custom-modal");
  const id = overlay.dataset.productId;
  const producto = PRODUCTOS.find(p => String(p.id) === String(id));
  const largo = document.getElementById("input-largo").value || "-";
  const ancho = document.getElementById("input-ancho").value || "-";
  const alto = document.getElementById("input-alto").value || "-";
  const cart = getCart();
  cart.push({ ...producto, personalizado: true, medidas: { largo, ancho, alto } });
  saveCart(cart);
  closeCustomModal();
  alert(`${producto.nombre} (personalizado) añadido al carrito.`);
}

function renderCart() {
  const container = document.getElementById("cart-items");
  if (!container) return;
  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = "<p>Tu carrito está vacío.</p>";
    document.getElementById("cart-total").textContent = "$0";
    return;
  }
  container.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div>
        <strong>${item.nombre}</strong>${item.personalizado ? " — Personalizada" : ""}
        ${item.personalizado ? `<div class="meta">Medidas: ${item.medidas.largo}x${item.medidas.ancho}x${item.medidas.alto} cm</div>` : ""}
      </div>
      <div>
        $${item.precio}
        <span style="cursor:pointer;color:var(--terracota);margin-left:10px" onclick="removeFromCart(${i})">✕</span>
      </div>
    </div>
  `).join("");
  const total = cart.reduce((sum, i) => sum + Number(i.precio), 0);
  document.getElementById("cart-total").textContent = `$${total}`;
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function productCardHTML(p) {
  const img = p.imagen ? p.imagen : `https://placehold.co/400x300/2a2a2a/F2B90C?text=${encodeURIComponent(p.nombre)}`;
  const agotado = p.disponible === false;
  return `
    <div class="card">
      <div style="position:relative;">
        <img src="${img}" alt="${p.nombre}">
        ${agotado ? '<div class="badge-agotado">Agotado</div>' : ""}
      </div>
      <div class="card-body">
        <h3>${p.nombre}</h3>
        <p class="desc">${p.descripcion || ""}</p>
        <div class="price">$${p.precio}</div>
        <div class="card-actions">
          <button class="btn" ${agotado ? "disabled" : ""} onclick="addStandardToCart('${p.id}')">${agotado ? "No disponible" : "Comprar Ahora"}</button>
          <button class="btn btn-outline" ${agotado ? "disabled" : ""} onclick="openCustomModal('${p.id}')">Compra Personalizada</button>
        </div>
      </div>
    </div>`;
}

// Productos destacados (home)
function renderDestacados() {
  const wrap = document.getElementById("productos-destacados");
  if (!wrap) return;
  const destacados = PRODUCTOS.filter(p => p.destacado);
  if (destacados.length === 0) {
    wrap.closest("section").style.display = "none";
    return;
  }
  wrap.innerHTML = destacados.map(productCardHTML).join("");
}

// Tarjetas de categoría — para index.html y catalogo.html (arriba de todo)
function renderCategoryCards() {
  document.querySelectorAll(".category-cards-slot").forEach(wrap => {
    wrap.innerHTML = CATEGORIAS.map(cat => `
      <a class="cat-card" href="catalogo.html#${cat.slug}">
        <div class="cat-label">${cat.nombre}</div>
      </a>`).join("");
  });
}

// Catálogo agrupado por categoría (usado en catalogo.html)
function renderCatalogPorCategoria() {
  const wrap = document.getElementById("catalog-por-categoria");
  if (!wrap) return;
  wrap.innerHTML = CATEGORIAS.map(cat => {
    const productosCat = PRODUCTOS.filter(p => p.categoria === cat.slug);
    if (productosCat.length === 0) return "";
    return `
      <div id="${cat.slug}" style="margin-bottom:50px;">
        <h2 class="section-title">${cat.nombre}</h2>
        <div class="grid">${productosCat.map(productCardHTML).join("")}</div>
      </div>`;
  }).join("");
}

async function submitOrder(event) {
  event.preventDefault();
  const cart = getCart();
  if (cart.length === 0) { alert("Tu carrito está vacío."); return; }
  const pedido = {
    nombre: document.getElementById("chk-nombre").value,
    telefono: document.getElementById("chk-telefono").value,
    correo: document.getElementById("chk-correo").value,
    direccion: document.getElementById("chk-direccion").value,
    ubicacion: window.__mz_ubicacion || null,
    metodoPago: document.querySelector('input[name="pago"]:checked')?.value || "no-especificado",
    items: cart,
    total: cart.reduce((sum, i) => sum + Number(i.precio), 0),
  };
  try {
    const res = await fetch("/api/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
    });
    if (!res.ok) throw new Error("Error al enviar el pedido");
  } catch (err) {
    console.warn("No se pudo contactar al backend:", err);
  }
  localStorage.removeItem("mz_cart");
  window.location.href = "confirmacion.html";
}

function detectarUbicacion() {
  const status = document.getElementById("ubicacion-status");
  if (!navigator.geolocation) { status.textContent = "Tu navegador no soporta geolocalización."; return; }
  status.textContent = "Solicitando permiso de ubicación...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      window.__mz_ubicacion = { lat: latitude, lng: longitude };
      status.innerHTML = `Ubicación detectada ✅ <a target="_blank" href="https://maps.google.com/?q=${latitude},${longitude}">Ver en Google Maps</a>`;
    },
    () => { status.textContent = "No se pudo obtener la ubicación. Escribe tu dirección manualmente."; }
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  await cargarConfiguracion();
  await cargarCategorias();
  await cargarProductos();
  renderCategoryCards();
  renderCatalogPorCategoria();
  renderDestacados();
  renderCart();
});
