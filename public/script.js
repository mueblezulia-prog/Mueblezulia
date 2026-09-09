// Mueble Zulia — lógica de front-end
// Los productos se piden a /api/productos (guardados en Supabase por el panel admin).
// Si el backend no responde (ej. estás abriendo el HTML directo), se usa un catálogo de ejemplo.

const CATEGORIAS = [
  { slug: "modulares", nombre: "Modulares" },
  { slug: "comedores", nombre: "Comedores" },
  { slug: "dormitorios", nombre: "Dormitorios" },
  { slug: "mesa-centro", nombre: "Mesa de Centro" },
  { slug: "reflejos", nombre: "Colección de Reflejos" },
  { slug: "mueble-tv", nombre: "Mueble TV" },
];

const PRODUCTOS_EJEMPLO = [
  { id: "sofa-x", nombre: "Sofá Zulia Confort", categoria: "modulares", desc: "Sofá de 3 puestos, tapizado premium.", precio: 480, imagen: "" },
  { id: "mesa-y", nombre: "Mesa Comedor Roble", categoria: "comedores", desc: "Mesa para 6 personas en madera de roble.", precio: 350, imagen: "" },
  { id: "cama-z", nombre: "Cama Matrimonial Nova", categoria: "dormitorios", desc: "Cama tapizada con cabecero acolchado.", precio: 300, imagen: "" },
  { id: "centro-w", nombre: "Mesa de Centro Mármol", categoria: "mesa-centro", desc: "Base metálica, tope de mármol.", precio: 180, imagen: "" },
  { id: "reflejo-v", nombre: "Puerta Colección Reflejos", categoria: "reflejos", desc: "Acabado espejado con marco decorativo.", precio: 220, imagen: "" },
  { id: "tv-u", nombre: "Mueble TV Line", categoria: "mueble-tv", desc: "Mueble suspendido con luz LED integrada.", precio: 260, imagen: "" },
];

const WHATSAPP_NUM = "584120000000"; // reemplazar con el número real de Mueble Zulia

let PRODUCTOS = [];

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
  return `
    <div class="card">
      <img src="${img}" alt="${p.nombre}">
      <div class="card-body">
        <h3>${p.nombre}</h3>
        <p class="desc">${p.desc || ""}</p>
        <div class="price">$${p.precio}</div>
        <div class="card-actions">
          <button class="btn" onclick="addStandardToCart('${p.id}')">Comprar Ahora</button>
          <button class="btn btn-outline" onclick="openCustomModal('${p.id}')">Compra Personalizada</button>
        </div>
      </div>
    </div>`;
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

// Cuadrícula simple (usada en index.html si se quisiera destacar productos)
function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;
  grid.innerHTML = PRODUCTOS.map(productCardHTML).join("");
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
  await cargarProductos();
  renderCatalog();
  renderCatalogPorCategoria();
  renderCart();
});
