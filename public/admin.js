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

async function cargarTablaProductos() {
  const res = await fetch("/api/productos");
  const productos = await res.json();
  const tbody = document.getElementById("tabla-productos");
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>$${p.precio}</td>
      <td class="admin-actions">
        <button class="btn btn-outline" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Editar</button>
        <button class="btn btn-terracota" onclick="borrarProducto(${p.id})">Borrar</button>
      </td>
    </tr>
  `).join("");
}

async function crearProducto(event) {
  event.preventDefault();
  const msg = document.getElementById("form-msg");
  const editId = event.target.dataset.editId;

  const body = {
    nombre: document.getElementById("f-nombre").value,
    categoria: document.getElementById("f-categoria").value,
    descripcion: document.getElementById("f-desc").value,
    precio: Number(document.getElementById("f-precio").value),
    imagen: document.getElementById("f-imagen").value,
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

document.addEventListener("DOMContentLoaded", () => {
  if (getPassword()) mostrarPanel();
});
