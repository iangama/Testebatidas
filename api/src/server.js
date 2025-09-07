import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import MidiWriter from "midi-writer-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const ROOT = path.resolve(__dirname, "..");
const EXPORTS_DIR = path.join(ROOT, "storage", "exports");
const DB_FILE = path.join(__dirname, "db.json");

function ensureDirs() {
  if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ presets: [] }, null, 2));
}
ensureDirs();

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/presets", (_req, res) => res.json(readDB().presets));
app.post("/api/presets", (req, res) => {
  const { name, bpm = 100, pattern = {}, kit = "default" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name é obrigatório" });
  const db = readDB();
  const preset = { id: uuid(), name, bpm, pattern, kit };
  db.presets.push(preset); writeDB(db);
  res.status(201).json(preset);
});
app.delete("/api/presets/:id", (req, res) => {
  const db = readDB();
  db.presets = db.presets.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.post("/api/export/midi", (req, res) => {
  try {
    const { bpm = 100, pattern = {} } = req.body || {};
    const track = new MidiWriter.Track();
    track.addEvent(new MidiWriter.TempoEvent({ bpm }));

    const toNotes = (steps, pitch) =>
      (steps || []).map(s => new MidiWriter.NoteEvent({ pitch, duration: "8", wait: `T${s}` }));

    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
    [...toNotes(pattern.kick, "C2"),
     ...toNotes(pattern.snare, "D2"),
     ...toNotes(pattern.hihat, "F#2")].forEach(evt => track.addEvent(evt));

    const writer = new MidiWriter.Writer([track]);
    ensureDirs();
    const id = uuid();
    const filePath = path.join(EXPORTS_DIR, `${id}.mid`);
    fs.writeFileSync(filePath, Buffer.from(writer.buildFile()));
    res.status(201).json({ id, type: "midi", status: "completed", resultUrl: `/exports/${id}.mid` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Falha ao exportar MIDI" });
  }
});

app.use("/exports", express.static(EXPORTS_DIR));

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => console.log(`[api] on http://127.0.0.1:${PORT}`));
