import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { exportQueue } from "../lib/queue";
import { z } from "zod";
import { promises as fs } from "fs";
import { join } from "path";
import { existsSync } from "fs";

const r = Router();

const ExportReq = z.object({
  type: z.enum(["midi", "wav"]),
  presetId: z.string().optional(),
  arrangement: z.any().optional()
});

r.post("/export", async (req: Request, res: Response) => {
  const data = ExportReq.parse(req.body);
  const jobRec = await prisma.exportJob.create({
    data: { type: data.type, status: "queued", presetId: data.presetId ?? null, payload: data.arrangement ?? {} }
  });

  await exportQueue.add("export", { jobId: jobRec.id });

  const exportDir = process.env.EXPORT_DIR || "/app/storage/exports";
  const snapshot = { type: data.type, arrangement: data.arrangement || null, presetId: data.presetId || null };
  await fs.writeFile(join(exportDir, `${jobRec.id}.json`), JSON.stringify(snapshot));

  res.status(202).json({ id: jobRec.id });
});

r.get("/jobs/:id", async (req: Request, res: Response) => {
  let j = await prisma.exportJob.findUnique({ where: { id: req.params.id } });
  if (!j) return res.status(404).json({ error: "not found" });

  if (j.status !== "completed" && j.status !== "failed") {
    const dir = process.env.EXPORT_DIR || "/app/storage/exports";
    const midi = join(dir, `${j.id}.mid`);
    const wav  = join(dir, `${j.id}.wav`);
    const url = existsSync(wav) ? `/exports/${j.id}.wav` : (existsSync(midi) ? `/exports/${j.id}.mid` : null);
    if (url) j = await prisma.exportJob.update({ where: { id: j.id }, data: { status: "completed", resultUrl: url } });
  }

  res.json(j);
});

export default r;
