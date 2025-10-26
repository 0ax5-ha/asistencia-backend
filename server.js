import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

// --- Inicialización básica ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_PATH = path.join(DATA_DIR, "registros.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "0ax5=AX%qweASD";

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());

// --- Crear carpeta y archivo si no existen ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]", "utf-8");

// --- Funciones auxiliares ---
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
const writeData = (data) =>
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// --- Ruta base ---
app.get("/", (req, res) => {
  res.send("✅ API de Asistencia operativa");
});

// --- Endpoint para marcar asistencia ---
app.post("/api/marcar", (req, res) => {
  const { nombre, curso, ubicacion } = req.body;
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "desconocida";

  // Validar datos
  if (!nombre || !curso || !ubicacion)
    return res
      .status(400)
      .json({ ok: false, msg: "Faltan datos obligatorios (nombre, curso o ubicación)." });

  const now = new Date();
  const fecha = now.toISOString().split("T")[0];
  const hora = now.toTimeString().split(" ")[0];

  const data = readData();

  // Evitar marcas duplicadas por IP el mismo día
  const yaMarcado = data.find((r) => r.ip === ip && r.fecha === fecha);
  if (yaMarcado)
    return res
      .status(403)
      .json({ ok: false, msg: "Ya marcaste asistencia hoy desde este dispositivo/IP." });

  const nuevo = { nombre, curso, fecha, hora, ip, ubicacion };
  data.push(nuevo);
  writeData(data);

  res.json({ ok: true, msg: "✅ Asistencia registrada con éxito." });
});

// --- Endpoint para ver registros (solo admin) ---
app.get("/api/registros", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY)
    return res.status(403).json({ ok: false, msg: "Clave inválida." });

  const data = readData();
  res.json(data);
});

// --- Exportar registros a CSV (solo admin) ---
app.get("/api/exportar", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(403).send("Clave inválida.");

  const data = readData();

  let csv = "nombre,curso,fecha,hora,ip,latitud,longitud\n";
  data.forEach((r) => {
    const lat = r.ubicacion?.lat ?? "";
    const lng = r.ubicacion?.lng ?? "";
    csv += `"${r.nombre}","${r.curso}","${r.fecha}","${r.hora}","${r.ip}","${lat}","${lng}"\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("asistencias.csv");
  res.send(csv);
});

// --- Iniciar servidor ---
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));
