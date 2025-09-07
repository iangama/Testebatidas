import express from "express";
import cors from "cors";
import path from "node:path";

import presetsRouter from "./routes/presets";
import exportsRouter from "./routes/exports";
import jobsRouter from "./routes/jobs";

const app = express();

// Se você usa Vite/Nginx com proxy, CORS é opcional; manter true não atrapalha
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "2mb" }));

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Rotas principais
app.use("/api/presets", presetsRouter);
app.use("/api/exports", exportsRouter);
app.use("/api/jobs", jobsRouter);

// Servir arquivos gerados pelo worker
const EXPORTS_DIR = process.env.EXPORTS_DIR || path.resolve(process.cwd(), "storage", "exports");
app.use("/exports", express.static(EXPORTS_DIR, { fallthrough: false }));

// Fallback simples
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT}`);
  console.log(`[api] exports dir: ${EXPORTS_DIR}`);
});
