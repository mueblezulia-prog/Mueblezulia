// Mueble Zulia — servidor backend (Railway)
// Sirve el sitio, recibe pedidos y expone el catálogo (tabla "productos" en Supabase).
// El panel de administración usa una contraseña simple (ADMIN_PASSWORD) enviada
// en el header "x-admin-password" en cada petición a /api/admin/*.

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
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

// ---------- Login del panel ----------
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD no está configurada en el servidor" });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
});

// ---------- Catálogo público ----------
app.get("/api/productos", async (req, res) => {
  if (!supabase) return res.json([]);
  const { data, error } = await supabase.from("productos").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Error leyendo productos:", error.message);
    return res.status(500).json([]);
  }
  res.json(data);
});

// ---------- Catálogo — administración ----------
app.post("/api/admin/productos", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, categoria, desc, precio, imagen } = req.body;
  const { data, error } = await supabase
    .from("productos")
    .insert([{ nombre, categoria, desc, precio, imagen }])
    .select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, producto: data[0] });
});

app.put("/api/admin/productos/:id", requireAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase no está configurado" });
  const { nombre, categoria, desc, precio, imagen } = req.body;
  const { error } = await supabase
    .from("productos")
    .update({ nombre, categoria, desc, precio, imagen })
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

// ---------- Pedidos ----------
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

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`Mueble Zulia corriendo en el puerto ${PORT}`);
});
