import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "registros.json");

app.use(cors());
app.use(bodyParser.json());

// Crear carpeta y archivo si no existen
if (!fs.existsSync(path.join(__dirname, "data"))) fs.mkdirSync(path.join(__dirname, "data"));
if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]");

// --- Funciones auxiliares ---
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// --- Endpoint para marcar asistencia ---
app.post("/api/marcar", (req, res) => {
  const { nombre, curso, ubicacion } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!nombre || !curso || !ubicacion)
    return res.status(400).json({ ok: false, msg: "Faltan datos." });

  const now = new Date();
  const fecha = now.toISOString().split("T")[0];
  const hora = now.toTimeString().split(" ")[0];

  const data = readData();

  // Evitar que una IP marque dos veces el mismo día
  const yaMarcado = data.find(
    (r) => r.ip === ip && r.fecha === fecha
  );
  if (yaMarcado) return res.status(403).json({ ok: false, msg: "Ya marcaste asistencia hoy." });

  const nuevo = { nombre, curso, fecha, hora, ip, ubicacion };
  data.push(nuevo);
  writeData(data);

  res.json({ ok: true, msg: "Asistencia registrada con éxito." });
});

// --- Endpoint para obtener registros (admin) ---
app.get("/api/registros", (req, res) => {
  const key = req.query.key;
  if (key !== "0ax5=AX%qweASD")
    return res.status(403).json({ ok: false, msg: "Clave inválida." });

  const data = readData();
  res.json(data);
});

// --- Exportar CSV ---
app.get("/api/exportar", (req, res) => {
  const key = req.query.key;
  if (key !== "0ax5=AX%qweASD")
    return res.status(403).send("Clave inválida.");

  const data = readData();
  let csv = "nombre,curso,fecha,hora,ip,ubicacion\n";
  data.forEach((r) => {
    csv += `"${r.nombre}","${r.curso}","${r.fecha}","${r.hora}","${r.ip}","${r.ubicacion}"\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("asistencias.csv");
  res.send(csv);
});

app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));
