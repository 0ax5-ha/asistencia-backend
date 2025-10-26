// server.js (versión compatible: acepta /api/marcar y /api/asistencia)
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
const DATA_DIR = path.join(__dirname, "data");
const DATA_PATH = path.join(DATA_DIR, "registros.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "0ax5=AX%qweASD";

app.use(cors());
app.use(bodyParser.json());

// Asegurar carpeta y archivo
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]", "utf-8");

const readData = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
  } catch (e) {
    console.error("Error leyendo datos:", e);
    return [];
  }
};
const writeData = (d) => fs.writeFileSync(DATA_PATH, JSON.stringify(d, null, 2), "utf-8");

app.get("/", (req, res) => res.send("✅ API de Asistencia operativa"));

// Helper: handler único para guardar (lo usamos para /api/marcar y /api/asistencia)
async function handleMark(req, res) {
  try {
    const { nombre, curso, ubicacion } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "desconocida";

    if (!nombre || !curso || !ubicacion) {
      return res.status(400).json({ ok: false, msg: "Faltan datos obligatorios (nombre, curso o ubicación)." });
    }

    // Normalizar ubicacion a string "lat, lng" si viene objeto
    let ubicString;
    if (typeof ubicacion === "string") ubicString = ubicacion;
    else if (typeof ubicacion === "object" && ubicacion !== null && ('lat' in ubicacion || 'lng' in ubicacion)) {
      ubicString = `${ubicacion.lat ?? ""}, ${ubicacion.lng ?? ""}`;
    } else {
      return res.status(400).json({ ok: false, msg: "Formato de ubicación inválido." });
    }

    const now = new Date();
    const fecha = now.toISOString().split("T")[0];
    const hora = now.toTimeString().split(" ")[0];

    const registros = readData();

    // Evitar duplicado por IP el mismo día
    const ya = registros.find(r => r.ip === ip && r.fecha === fecha);
    if (ya) return res.status(403).json({ ok: false, msg: "Ya marcaste asistencia hoy desde esta IP." });

    const nuevo = {
      id: 'r_' + Math.random().toString(36).slice(2,9),
      nombre,
      curso,
      fecha,
      hora,
      ip,
      ubicacion: ubicString,
      created_at: new Date().toISOString()
    };
    registros.push(nuevo);
    writeData(registros);

    return res.json({ ok: true, msg: "Asistencia registrada con éxito.", record: nuevo });
  } catch (err) {
    console.error("Error en handleMark:", err);
    return res.status(500).json({ ok: false, msg: "Error interno del servidor." });
  }
}

// Rutas que aceptan la misma lógica (compatibilidad)
app.post("/api/marcar", handleMark);
app.post("/api/asistencia", handleMark);

// Obtener registros (admin)
app.get("/api/registros", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(403).json({ ok: false, msg: "Clave inválida." });
  const registros = readData();
  res.json({ ok: true, rows: registros });
});

// Export CSV (admin)
app.get("/api/exportar", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(403).send("Clave inválida.");
  const rows = readData();
  const esc = s => `"${String(s ?? "").replace(/"/g,'""')}"`;
  let csv = "id,nombre,curso,fecha,hora,ip,ubicacion,created_at\n";
  rows.forEach(r => {
    csv += [r.id, r.nombre, r.curso, r.fecha, r.hora, r.ip, r.ubicacion, r.created_at].map(esc).join(",") + "\n";
  });
  res.header("Content-Type", "text/csv");
  res.attachment("asistencias.csv");
  res.send(csv);
});

app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));
