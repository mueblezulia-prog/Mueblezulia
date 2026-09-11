// Mueble Zulia — panel de administración
// La contraseña se guarda solo en sessionStorage del navegador y se envía
// en el header x-admin-password en cada petición protegida.

function getPassword() { return sessionStorage.getItem("mz_admin_pw"); }

async function iniciarSesion(event) {
  event.preventDefault();
  const password = document.getElementById("admin-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      errorEl.textContent = data.error || "Contraseña incorrecta";
      return;
    }
    sessionStorage.setItem("mz_admin_pw", password);
    mostrarPanel();
  } catch (err) {
    errorEl.textContent = "No se pudo conectar con el servidor.";
  }
}

function cerrarSesion() {
  sessionStorage.removeItem("mz_admin_pw");
  document.getElementById("panel").style.display = "none";
  document.getElementById("login-box").style.display = "block";
  document.getElementById("admin-logout").style.display = "none";
}

function mostrarPanel() {
  document.getElementById("login-box").style.display = "none";
  document.getElementById("panel").style.display = "block";
  document.getElementById("admin-logout").style.display = "block";
  cargarCategoriasEnSelect();
  cargarTablaProductos();
  cargarTablaCategorias();
  cargarEstadisticas();
  cargarTablaPedidos();
  cargarConfiguracion();
}

function cambiarTab(tabId) {
  document.querySelectorAll(".admin-tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add("active");
}

// ---------------- CATEGORÍAS ----------------

async function cargarCategoriasEnSelect() {
  const res = await fetch("/api/categorias");
  const categorias = await res.json();
  const select = document.getElementById("f-categoria");
  select.innerHTML = categorias.map(c => `<option value="${c.slug}">${c.nombre}</option>`).join("");
}

async function cargarTablaCategorias() {
  const res = await fetch("/api/categorias");
  const categorias = await res.json();
  const tbody = document.getElementById("tabla-categorias");
  tbody.innerHTML = categorias.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.slug}</td>
      <td>${c.orden ?? 0}</td>
      <td class="admin-actions">
        <button class="btn btn-outline" onclick='editarCategoria(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Editar</button>
        <button class="btn btn-terracota" onclick="borrarCategoria(${c.id})">Borrar</button>
      </td>
    </tr>
  `).join("");
}

async function crearCategoria(event) {
  event.preventDefault();
  const msg = document.getElementById("cat-form-msg");
  const form = event.target;
  const editId = form.dataset.editId;

  const body = {
    nombre: document.getElementById("c-nombre").value,
    slug: document.getElementById("c-slug").value.trim().toLowerCase(),
    orden: Number(document.getElementById("c-orden").value) || 0,
  };

  const url = editId ? `/api/admin/categorias/${editId}` : "/api/admin/categorias";
  const method = editId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      msg.style.color = "var(--terracota)";
      msg.textContent = data.error || "Error al guardar";
      return;
    }
    msg.style.color = "#34c759";
    msg.textContent = editId ? "Categoría actualizada ✅" : "Categoría añadida ✅";
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Añadir categoría";
    cargarTablaCategorias();
    cargarCategoriasEnSelect();
  } catch (err) {
    msg.style.color = "var(--terracota)";
    msg.textContent = "No se pudo conectar con el servidor.";
  }
}

function editarCategoria(c) {
  document.getElementById("c-nombre").value = c.nombre;
  document.getElementById("c-slug").value = c.slug;
  document.getElementById("c-orden").value = c.orden ?? 0;
  const form = document.querySelector('form[onsubmit="crearCategoria(event)"]');
  form.dataset.editId = c.id;
  form.querySelector("button[type=submit]").textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function borrarCategoria(id) {
  if (!confirm("¿Seguro que quieres borrar esta categoría? Los muebles que la usen quedarán sin categoría visible.")) return;
  const res = await fetch(`/api/admin/categorias/${id}`, {
    method: "DELETE",
    headers: { "x-admin-password": getPassword() },
  });
  const data = await res.json();
  if (data.ok) { cargarTablaCategorias(); cargarCategoriasEnSelect(); }
  else alert(data.error || "Error al borrar");
}

// ---------------- MUEBLES ----------------

let PRODUCTOS_ADMIN = [];

async function cargarTablaProductos() {
  const res = await fetch("/api/productos");
  PRODUCTOS_ADMIN = await res.json();
  pintarTablaProductos(PRODUCTOS_ADMIN);
}

function pintarTablaProductos(lista) {
  const tbody = document.getElementById("tabla-productos");
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>$${p.precio}</td>
      <td>
        ${p.destacado ? '⭐ Destacado ' : ''}${p.disponible === false ? '<span style="color:var(--terracota);">Agotado</span>' : '<span style="color:#34c759;">Disponible</span>'}
      </td>
      <td class="admin-actions">
        <button class="btn btn-outline" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Editar</button>
        <button class="btn btn-terracota" onclick="borrarProducto(${p.id})">Borrar</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">No hay muebles que coincidan.</td></tr>`;
}

function filtrarProductos() {
  const q = document.getElementById("buscar-productos").value.trim().toLowerCase();
  const filtrados = PRODUCTOS_ADMIN.filter(p => p.nombre.toLowerCase().includes(q));
  pintarTablaProductos(filtrados);
}

function previsualizarImagen() {
  const fileInput = document.getElementById("f-imagen-file");
  const preview = document.getElementById("f-imagen-preview");
  const file = fileInput.files[0];
  if (!file) { preview.style.display = "none"; return; }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
}

async function subirImagenSiHayArchivo() {
  const fileInput = document.getElementById("f-imagen-file");
  const status = document.getElementById("upload-status");
  const file = fileInput.files[0];
  if (!file) return document.getElementById("f-imagen").value; // sin archivo nuevo, deja la url actual (si la hay)

  status.textContent = "Subiendo imagen...";
  const formData = new FormData();
  formData.append("imagen", file);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "x-admin-password": getPassword() },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    status.textContent = "";
    throw new Error(data.error || "No se pudo subir la imagen");
  }
  status.textContent = "Imagen subida ✅";
  return data.url;
}

async function crearProducto(event) {
  event.preventDefault();
  const msg = document.getElementById("form-msg");
  const editId = event.target.dataset.editId;

  let imagenUrl;
  try {
    imagenUrl = await subirImagenSiHayArchivo();
  } catch (err) {
    msg.style.color = "var(--terracota)";
    msg.textContent = err.message;
    return;
  }

  const body = {
    nombre: document.getElementById("f-nombre").value,
    categoria: document.getElementById("f-categoria").value,
    descripcion: document.getElementById("f-desc").value,
    precio: Number(document.getElementById("f-precio").value),
    imagen: imagenUrl || "",
    destacado: document.getElementById("f-destacado").checked,
    disponible: document.getElementById("f-disponible").checked,
  };

  const url = editId ? `/api/admin/productos/${editId}` : "/api/admin/productos";
  const method = editId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      msg.style.color = "var(--terracota)";
      msg.textContent = data.error || "Error al guardar";
      return;
    }
    msg.style.color = "#34c759";
    msg.textContent = editId ? "Mueble actualizado ✅" : "Mueble añadido ✅";
    event.target.reset();
    document.getElementById("f-imagen-preview").style.display = "none";
    document.getElementById("f-imagen").value = "";
    document.getElementById("upload-status").textContent = "";
    delete event.target.dataset.editId;
    event.target.querySelector("button[type=submit]").textContent = "Añadir mueble";
    cargarTablaProductos();
  } catch (err) {
    msg.style.color = "var(--terracota)";
    msg.textContent = "No se pudo conectar con el servidor.";
  }
}

function editarProducto(p) {
  document.getElementById("f-nombre").value = p.nombre;
  document.getElementById("f-categoria").value = p.categoria;
  document.getElementById("f-desc").value = p.descripcion || "";
  document.getElementById("f-precio").value = p.precio;
  document.getElementById("f-imagen").value = p.imagen || "";
  document.getElementById("f-imagen-file").value = "";
  const preview = document.getElementById("f-imagen-preview");
  if (p.imagen) { preview.src = p.imagen; preview.style.display = "block"; }
  else { preview.style.display = "none"; }
  document.getElementById("f-destacado").checked = !!p.destacado;
  document.getElementById("f-disponible").checked = p.disponible !== false;
  const form = document.querySelector('form[onsubmit="crearProducto(event)"]');
  form.dataset.editId = p.id;
  form.querySelector("button[type=submit]").textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function borrarProducto(id) {
  if (!confirm("¿Seguro que quieres borrar este mueble del catálogo?")) return;
  const res = await fetch(`/api/admin/productos/${id}`, {
    method: "DELETE",
    headers: { "x-admin-password": getPassword() },
  });
  const data = await res.json();
  if (data.ok) cargarTablaProductos();
  else alert(data.error || "Error al borrar");
}

// ---------------- ESTADÍSTICAS ----------------

async function cargarEstadisticas() {
  const grid = document.getElementById("stats-grid");
  try {
    const res = await fetch("/api/admin/estadisticas", {
      headers: { "x-admin-password": getPassword() },
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      grid.innerHTML = `<div class="stat-card"><div class="stat-value">—</div><div class="stat-label">${data.error || "Error cargando estadísticas"}</div></div>`;
      return;
    }

    grid.innerHTML = `
      <div class="stat-card"><div class="stat-value">${data.totalPedidos}</div><div class="stat-label">Pedidos totales</div></div>
      <div class="stat-card"><div class="stat-value">$${data.totalVentas.toFixed(2)}</div><div class="stat-label">Ventas totales</div></div>
      <div class="stat-card"><div class="stat-value">$${data.ticketPromedio.toFixed(2)}</div><div class="stat-label">Ticket promedio</div></div>
    `;

    document.getElementById("tabla-mas-vendidos").innerHTML = data.masVendidos.length
      ? data.masVendidos.map(m => `<tr><td>${m.nombre}</td><td>${m.cantidad}</td></tr>`).join("")
      : `<tr><td colspan="2">Todavía no hay ventas registradas.</td></tr>`;

    document.getElementById("tabla-ventas-dia").innerHTML = Object.entries(data.ventasPorDia)
      .map(([fecha, total]) => `<tr><td>${fecha}</td><td>$${Number(total).toFixed(2)}</td></tr>`).join("");
  } catch (err) {
    grid.innerHTML = `<div class="stat-card"><div class="stat-value">—</div><div class="stat-label">No se pudo conectar con el servidor</div></div>`;
  }
}

// ---------------- PEDIDOS ----------------

let PEDIDOS_ADMIN = [];

async function cargarTablaPedidos() {
  try {
    const res = await fetch("/api/admin/pedidos", { headers: { "x-admin-password": getPassword() } });
    const data = await res.json();
    PEDIDOS_ADMIN = Array.isArray(data) ? data : [];
    pintarTablaPedidos(PEDIDOS_ADMIN);
  } catch (err) {
    document.getElementById("tabla-pedidos").innerHTML = `<tr><td colspan="6">No se pudo cargar los pedidos.</td></tr>`;
  }
}

function pintarTablaPedidos(lista) {
  const tbody = document.getElementById("tabla-pedidos");
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td>${(p.creado_en || "").slice(0, 10)}</td>
      <td>${p.nombre || "-"}</td>
      <td>${p.telefono || "-"}</td>
      <td>$${Number(p.total || 0).toFixed(2)}</td>
      <td>
        <select onchange="cambiarEstadoPedido(${p.id}, this.value)">
          <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
          <option value="confirmado" ${p.estado === "confirmado" ? "selected" : ""}>Confirmado</option>
          <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>Entregado</option>
        </select>
      </td>
      <td><button class="btn btn-outline" onclick='verDetallePedido(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Ver items</button></td>
    </tr>
  `).join("") || `<tr><td colspan="6">Todavía no hay pedidos.</td></tr>`;
}

function filtrarPedidos() {
  const q = document.getElementById("buscar-pedidos").value.trim().toLowerCase();
  const estado = document.getElementById("filtro-estado-pedido").value;
  const filtrados = PEDIDOS_ADMIN.filter(p => {
    const coincideTexto = (p.nombre || "").toLowerCase().includes(q) || (p.telefono || "").includes(q);
    const coincideEstado = !estado || p.estado === estado;
    return coincideTexto && coincideEstado;
  });
  pintarTablaPedidos(filtrados);
}

async function cambiarEstadoPedido(id, estado) {
  const res = await fetch(`/api/admin/pedidos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
    body: JSON.stringify({ estado }),
  });
  const data = await res.json();
  if (!data.ok) alert(data.error || "No se pudo actualizar el estado");
}

function verDetallePedido(p) {
  const items = (p.items || []).map(i =>
    `• ${i.nombre}${i.personalizado ? ` (personalizado: ${i.medidas?.largo}x${i.medidas?.ancho}x${i.medidas?.alto} cm)` : ""} — $${i.precio}`
  ).join("\n");
  alert(`Pedido de ${p.nombre}\nDirección: ${p.direccion || "no especificada"}\nMétodo de pago: ${p.metodo_pago || p.metodoPago || "-"}\n\nMuebles:\n${items}`);
}

// ---------------- CONFIGURACIÓN ----------------

async function cargarConfiguracion() {
  try {
    const res = await fetch("/api/configuracion");
    const c = await res.json();
    document.getElementById("cfg-telefono").value = c.telefono || "";
    document.getElementById("cfg-direccion").value = c.direccion || "";
    document.getElementById("cfg-maps").value = c.google_maps_url || "";
    document.getElementById("cfg-whatsapp").value = c.whatsapp_url || "";
    document.getElementById("cfg-instagram").value = c.instagram_url || "";
    document.getElementById("cfg-tiktok").value = c.tiktok_url || "";
  } catch (err) {
    console.warn("No se pudo cargar la configuración", err);
  }
}

async function guardarConfiguracion(event) {
  event.preventDefault();
  const msg = document.getElementById("cfg-msg");
  const body = {
    telefono: document.getElementById("cfg-telefono").value,
    direccion: document.getElementById("cfg-direccion").value,
    google_maps_url: document.getElementById("cfg-maps").value,
    whatsapp_url: document.getElementById("cfg-whatsapp").value,
    instagram_url: document.getElementById("cfg-instagram").value,
    tiktok_url: document.getElementById("cfg-tiktok").value,
  };
  try {
    const res = await fetch("/api/admin/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      msg.style.color = "var(--terracota)";
      msg.textContent = data.error || "Error al guardar";
      return;
    }
    msg.style.color = "#34c759";
    msg.textContent = "Configuración guardada ✅. Los cambios se verán en el sitio al recargar.";
  } catch (err) {
    msg.style.color = "var(--terracota)";
    msg.textContent = "No se pudo conectar con el servidor.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (getPassword()) mostrarPanel();
});
