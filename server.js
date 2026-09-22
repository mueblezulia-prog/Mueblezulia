// Mueble Zulia — servidor backend (Railway)
// Sirve el sitio y expone la API usada por el catálogo y el panel de administración.
// El panel usa una contraseña simple (ADMIN_PASSWORD) enviada en el header
// "x-admin-password" en cada petición a /api/admin/*.

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB máx

// Railway usa Node 18, y las versiones recientes de @supabase/supabase-js
// requieren WebSocket nativo (disponible solo desde Node 22+). Este parche
// le da esa pieza que falta antes de crear el cliente de Supabase.
if (typeof globalThis.WebSocket === "undefined") {
  const { default: WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Sirve la app React ya compilada (npm run build -> dist/), que Railway
// genera automáticamente antes de "npm start". No se sirve "public/"
// porque ese es el sitio estático anterior, reemplazado por esta app.
app.use(express.static(path.join(__dirname, "dist")));

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD no está configurada en el servidor" });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
  }
  next();
}

// ================= LOGIN =================
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD no está configurada en el servidor" });
  }
  if (password === process.env.ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
});

// ================= CONFIGURACIÓN DEL SITIO =================
app.get("/api/configuracion", async (req, res) => {
  if (!supabase) return res.json({});
  const { data, error } = await supabase.from("configuracion").select("*").eq("id", 1).single();
  if (error) {
    console.error("Error leyendo configuración:", error.message);
    return res.json({});
  }
  res.json(data);
});

app.put("/api/admin/configuracion", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { telefono, direccion, google_maps_url, instagram_url, tiktok_url, whatsapp_url } = req.body;
  const { error } = await supabase
    .from("configuracion")
    .update({ telefono, direccion, google_maps_url, instagram_url, tiktok_url, whatsapp_url })
    .eq("id", 1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// ================= SUBIDA DE IMÁGENES =================
app.post("/api/admin/upload", requireAdmin, upload.single("imagen"), async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  if (!req.file) return res.status(400).json({ ok: false, error: "No se recibió ninguna imagen" });

  const ext = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
  const filename = `producto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("productos-imagenes")
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const { data } = supabase.storage.from("productos-imagenes").getPublicUrl(filename);
  res.json({ ok: true, url: data.publicUrl });
});

// ================= CATEGORÍAS =================
app.get("/api/categorias", async (req, res) => {
  if (!supabase) return res.json([]);
  const { data, error } = await supabase.from("categorias").select("*").order("orden", { ascending: true });
  if (error) {
    console.error("Error leyendo categorías:", error.message);
    return res.status(500).json([]);
  }
  res.json(data);
});

app.post("/api/admin/categorias", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, slug, orden, imagen } = req.body;
  const { data, error } = await supabase
    .from("categorias")
    .insert([{ nombre, slug, orden: orden || 0, imagen }])
    .select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, categoria: data[0] });
});

app.put("/api/admin/categorias/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, slug, orden, imagen } = req.body;
  const { error } = await supabase.from("categorias").update({ nombre, slug, orden, imagen }).eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

app.delete("/api/admin/categorias/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { error } = await supabase.from("categorias").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// ================= PRODUCTOS (CATÁLOGO) =================
app.get("/api/productos", async (req, res) => {
  if (!supabase) return res.json([]);
  const { data, error } = await supabase.from("productos").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Error leyendo productos:", error.message);
    return res.status(500).json([]);
  }
  res.json(data);
});

app.post("/api/admin/productos", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, categoria, descripcion, precio, imagen, destacado, disponible } = req.body;
  const { data, error } = await supabase
    .from("productos")
    .insert([{ nombre, categoria, descripcion, precio, imagen, destacado: !!destacado, disponible: disponible !== false }])
    .select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, producto: data[0] });
});

app.put("/api/admin/productos/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, categoria, descripcion, precio, imagen, destacado, disponible } = req.body;
  const { error } = await supabase
    .from("productos")
    .update({ nombre, categoria, descripcion, precio, imagen, destacado: !!destacado, disponible: disponible !== false })
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

app.delete("/api/admin/productos/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { error } = await supabase.from("productos").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// ================= PEDIDOS =================
app.post("/api/pedido", async (req, res) => {
  const pedido = req.body;
  console.log("Nuevo pedido recibido:", JSON.stringify(pedido, null, 2));
  try {
    if (supabase) {
      const { error } = await supabase.from("pedidos").insert([
        {
          nombre: pedido.nombre,
          telefono: pedido.telefono,
          correo: pedido.correo,
          direccion: pedido.direccion,
          ubicacion: pedido.ubicacion,
          metodo_pago: pedido.metodoPago,
          items: pedido.items,
          total: pedido.total,
          estado: "pendiente",
        },
      ]);
      if (error) console.error("Error guardando en Supabase:", error.message);
    }

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const texto = `🛋️ Nuevo pedido — Mueble Zulia
Cliente: ${pedido.nombre} / ${pedido.telefono}
Total: $${pedido.total}
Método de pago: ${pedido.metodoPago}
Dirección: ${pedido.direccion || "no especificada"}
Ubicación GPS: ${pedido.ubicacion ? `https://maps.google.com/?q=${pedido.ubicacion.lat},${pedido.ubicacion.lng}` : "no compartida"}`;

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto }),
      }).catch((e) => console.error("Error enviando a Telegram:", e.message));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error procesando el pedido:", err);
    res.status(500).json({ ok: false, error: "Error interno" });
  }
});

app.get("/api/admin/pedidos", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { data, error } = await supabase.from("pedidos").select("*").order("creado_en", { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json(data);
});

app.put("/api/admin/pedidos/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { estado } = req.body;
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// ================= ESTADÍSTICAS (admin) =================
app.get("/api/admin/estadisticas", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { data: pedidos, error } = await supabase.from("pedidos").select("*").order("creado_en", { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const totalPedidos = pedidos.length;
  const totalVentas = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

  const porEstado = {};
  pedidos.forEach((p) => {
    const e = p.estado || "pendiente";
    porEstado[e] = (porEstado[e] || 0) + 1;
  });

  const conteoProductos = {};
  pedidos.forEach((p) => {
    (p.items || []).forEach((item) => {
      conteoProductos[item.nombre] = (conteoProductos[item.nombre] || 0) + 1;
    });
  });
  const masVendidos = Object.entries(conteoProductos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }));

  const hoy = new Date();
  const ventasPorDia = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    ventasPorDia[d.toISOString().slice(0, 10)] = 0;
  }
  pedidos.forEach((p) => {
    const key = (p.creado_en || "").slice(0, 10);
    if (key in ventasPorDia) ventasPorDia[key] += Number(p.total || 0);
  });

  res.json({
    ok: true,
    totalPedidos,
    totalVentas,
    ticketPromedio,
    porEstado,
    masVendidos,
    ventasPorDia,
    ultimosPedidos: pedidos.slice(0, 10),
  });
});

// ================= GEMINI: mejorar descripción de producto =================
// El admin escribe una descripción corta o larga y pide "Mejorar con IA";
// esto la manda a Gemini (Google) desde el SERVIDOR (nunca desde el
// navegador) para no exponer la llave de la API al público. Requiere la
// variable de entorno GEMINI_API_KEY configurada en Railway — mientras no
// esté puesta, este endpoint responde con un error claro en vez de fallar
// en silencio.
app.post("/api/mejorar-descripcion", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: "Falta configurar GEMINI_API_KEY en el servidor (Railway → Variables).",
    });
  }

  const { texto, tipo } = req.body; // tipo: "corta" | "larga"
  if (!texto || !texto.trim()) {
    return res.status(400).json({ ok: false, error: "Escribe primero una descripción para mejorar." });
  }

  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const instrucciones =
    tipo === "corta"
      ? 'Mejora esta descripción CORTA de un mueble para que suene más atractiva y vendedora, en español de Venezuela. Debe quedar en UNA sola frase breve (máximo 15 palabras), sin comillas ni emojis. Devuelve SOLO el texto mejorado, nada más.'
      : 'Mejora esta descripción LARGA de un mueble para que suene más atractiva y vendedora, en español de Venezuela, resaltando materiales, comodidad y estilo. Entre 2 y 4 frases. Devuelve SOLO el texto mejorado, sin comillas, títulos ni emojis.';

  try {
    const respuestaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${instrucciones}\n\nDescripción original:\n"${texto.trim()}"` }] }],
        }),
      }
    );
    const datos = await respuestaGemini.json();
    if (!respuestaGemini.ok) {
      throw new Error(datos?.error?.message || "Gemini respondió con un error.");
    }
    const mejorado = datos?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!mejorado) throw new Error("Gemini no devolvió ningún texto.");
    res.json({ ok: true, mejorado });
  } catch (err) {
    console.error("Error mejorando descripción con Gemini:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/health", (req, res) => res.send("ok"));

// Catch-all: cualquier ruta que no sea /api/* o /health devuelve el
// index.html de la app React, para que funcionen las rutas del cliente
// (ej. /producto/123) al recargar la página o entrar por link directo.
app.get(/^(?!\/api|\/health).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mueble Zulia corriendo en el puerto ${PORT}`);
});
