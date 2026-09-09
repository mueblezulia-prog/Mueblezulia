// Mueble Zulia — panel de administración
// La contraseña se guarda solo en sessionStorage del navegador (se borra al cerrar pestaña
// o al hacer "Cerrar sesión") y se envía en el header x-admin-password en cada petición.

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
  cargarTabla();
}

async function cargarTabla() {
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
    cargarTabla();
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
  const form = document.querySelector("form.admin-form");
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
  if (data.ok) cargarTabla();
  else alert(data.error || "Error al borrar");
}

document.addEventListener("DOMContentLoaded", () => {
  if (getPassword()) mostrarPanel();
});
