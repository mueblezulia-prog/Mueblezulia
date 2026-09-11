// Mueble Zulia — Fase 1 (React)
// Este servidor NO corre la app en modo "desarrollo" (como npm run dev).
// Sirve los archivos YA CONSTRUIDOS por "vite build" (carpeta dist/),
// que es como debe funcionar en producción (Railway).
//
// Flujo en Railway:
//   1. Railway corre "npm install"
//   2. Railway corre "npm run build"  -> genera la carpeta dist/
//   3. Railway corre "npm start"      -> este archivo, sirve dist/

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Como es una Single Page App (React Router), cualquier ruta que no sea
// un archivo real debe devolver index.html para que React Router decida
// qué mostrar (si no, recargar /catalogo por ejemplo daría error 404).
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mueble Zulia (Fase 1 - React) corriendo en el puerto ${PORT}`);
});
