import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import health from "./routes/health";
import presets from "./routes/presets";
import exportr from "./routes/export";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api", health);
app.use("/api", presets);
app.use("/api", exportr);

// estáticos para /exports
const exportDir = process.env.EXPORT_DIR || "/app/storage/exports";
app.use("/exports", express.static(exportDir));

app.get("/", (_req: Request, res: Response) => res.send("BeatGen API"));

const port = Number(process.env.API_PORT || 4000);
const host = process.env.API_HOST || "0.0.0.0";
app.listen(port, host, () => console.log(`API on http://${host}:${port}`));
