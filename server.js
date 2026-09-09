// Mueble Zulia — servidor backend (Railway)
// Sirve los archivos estáticos del sitio y recibe los pedidos del checkout.
// Conexión a Supabase opcional: si SUPABASE_URL y SUPABASE_KEY están definidas,
// guarda cada pedido en la tabla "pedidos".

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

// Recibe un pedido desde checkout.html
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

    // Notificación a Telegram (opcional): define TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const texto = `🛋️ Nuevo pedido — Mueble Zulia
Cliente: ${pedido.nombre} / ${pedido.telefono}
Total: $${pedido.total}
Método de pago: ${pedido.metodoPago}
Dirección: ${pedido.direccion || "no especificada"}
Ubicación GPS: ${pedido.ubicacion ? `https://maps.google.com/?q=${pedido.ubicacion.lat},${pedido.ubicacion.lng}` : "no compartida"}`;

      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: texto,
          }),
        }
      ).catch((e) => console.error("Error enviando a Telegram:", e.message));
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
