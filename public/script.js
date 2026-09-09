// Mueble Zulia — lógica de front-end (catálogo, carrito, personalización)
// Datos de productos: en producción vendrían de Supabase vía /api/productos

const PRODUCTOS = [
  { id: "sofa-x", nombre: "Sofá Zulia Confort", desc: "Sofá de 3 puestos, tapizado premium, estructura de madera sólida.", precio: 480 },
  { id: "mesa-y", nombre: "Mesa Comedor Roble", desc: "Mesa para 6 personas en madera de roble maciza.", precio: 350 },
  { id: "cama-z", nombre: "Cama Matrimonial Nova", desc: "Cama tapizada con cabecero acolchado, incluye base.", precio: 300 },
  { id: "closet-w", nombre: "Closet Modular 3 Puertas", desc: "Closet modular con espejo y organizadores internos.", precio: 420 },
];

const WHATSAPP_NUM = "584120000000"; // reemplazar con el número real de Mueble Zulia

function getCart() {
  return JSON.parse(localStorage.getItem("mz_cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("mz_cart", JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = getCart().length;
}

function addStandardToCart(id) {
  const producto = PRODUCTOS.find(p => p.id === id);
  if (!producto) return;
  const cart = getCart();
  cart.push({ ...producto, personalizado: false });
  saveCart(cart);
  alert(`${producto.nombre} añadido al carrito.`);
}

function openCustomModal(id) {
  const producto = PRODUCTOS.find(p => p.id === id);
  if (!producto) return;
  const overlay = document.getElementById("custom-modal");
  overlay.dataset.productId = id;
  document.getElementById("custom-modal-title").textContent = `Personaliza tu ${producto.nombre}`;
  overlay.classList.add("active");

  const mensaje = encodeURIComponent(
    `Hola, quiero consultar la personalización del ${producto.nombre} (medidas a la medida).`
  );
  document.getElementById("whatsapp-consulta").href = `https://wa.me/${WHATSAPP_NUM}?text=${mensaje}`;
}

function closeCustomModal() {
  document.getElementById("custom-modal").classList.remove("active");
}

function addCustomToCart() {
  const overlay = document.getElementById("custom-modal");
  const id = overlay.dataset.productId;
  const producto = PRODUCTOS.find(p => p.id === id);
  const largo = document.getElementById("input-largo").value || "-";
  const ancho = document.getElementById("input-ancho").value || "-";
  const alto = document.getElementById("input-alto").value || "-";

  const cart = getCart();
  cart.push({
    ...producto,
    personalizado: true,
    medidas: { largo, ancho, alto },
  });
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
        <span style="cursor:pointer;color:#b33;margin-left:10px" onclick="removeFromCart(${i})">✕</span>
      </div>
    </div>
  `).join("");
  const total = cart.reduce((sum, i) => sum + i.precio, 0);
  document.getElementById("cart-total").textContent = `$${total}`;
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;
  grid.innerHTML = PRODUCTOS.map(p => `
    <div class="card">
      <img src="https://placehold.co/400x300?text=${encodeURIComponent(p.nombre)}" alt="${p.nombre}">
      <div class="card-body">
        <h3>${p.nombre}</h3>
        <p class="desc">${p.desc}</p>
        <div class="price">$${p.precio}</div>
        <div class="card-actions">
          <button class="btn" onclick="addStandardToCart('${p.id}')">Comprar Ahora</button>
          <button class="btn btn-outline" onclick="openCustomModal('${p.id}')">Compra Personalizada</button>
        </div>
      </div>
    </div>
  `).join("");
}

// Checkout: envía el pedido al backend (Railway -> Supabase / notificación)
async function submitOrder(event) {
  event.preventDefault();
  const cart = getCart();
  if (cart.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }
  const pedido = {
    nombre: document.getElementById("chk-nombre").value,
    telefono: document.getElementById("chk-telefono").value,
    correo: document.getElementById("chk-correo").value,
    direccion: document.getElementById("chk-direccion").value,
    ubicacion: window.__mz_ubicacion || null,
    metodoPago: document.querySelector('input[name="pago"]:checked')?.value || "no-especificado",
    items: cart,
    total: cart.reduce((sum, i) => sum + i.precio, 0),
  };

  try {
    const res = await fetch("/api/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
    });
    if (!res.ok) throw new Error("Error al enviar el pedido");
  } catch (err) {
    console.warn("No se pudo contactar al backend (¿está corriendo Railway?):", err);
  }

  localStorage.removeItem("mz_cart");
  window.location.href = "confirmacion.html";
}

function detectarUbicacion() {
  const status = document.getElementById("ubicacion-status");
  if (!navigator.geolocation) {
    status.textContent = "Tu navegador no soporta geolocalización.";
    return;
  }
  status.textContent = "Solicitando permiso de ubicación...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      window.__mz_ubicacion = { lat: latitude, lng: longitude };
      status.innerHTML = `Ubicación detectada ✅ <a target="_blank" href="https://maps.google.com/?q=${latitude},${longitude}">Ver en Google Maps</a>`;
    },
    () => { status.textContent = "No se pudo obtener la ubicación. Puedes escribir tu dirección manualmente."; }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  renderCatalog();
  renderCart();
});
