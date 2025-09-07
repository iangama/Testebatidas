import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const router = Router();

const PRESETS_DIR = path.resolve(process.cwd(), "storage", "presets");
fs.mkdirSync(PRESETS_DIR, { recursive: true });

router.post("/", async (req, res) => {
  try {
    const { bpm, steps, tracks, pattern } = req.body ?? {};
    if (
      typeof bpm !== "number" ||
      typeof steps !== "number" ||
      !Array.isArray(tracks) ||
      typeof pattern !== "object"
    ) {
      return res.status(400).json({ error: "payload inválido" });
    }
    const id = crypto.randomUUID();
    const data = { id, bpm, steps, tracks, pattern, createdAt: new Date().toISOString() };
    fs.writeFileSync(path.join(PRESETS_DIR, `${id}.json`), JSON.stringify(data, null, 2));
    return res.status(201).json({ id });
  } catch (e: any) {
    console.error("[presets] error:", e);
    return res.status(500).json({ error: e?.message || "erro interno" });
  }
});

export default router;
