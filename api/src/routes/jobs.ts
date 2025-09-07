import { Router } from "express";
import { Queue } from "bullmq";
import fs from "node:fs";
import path from "node:path";

const router = Router();
const connection = { url: process.env.REDIS_URL || "redis://redis:6379" };
const queueName = process.env.EXPORT_QUEUE || "exports";
const queue = new Queue(queueName, { connection });

const EXPORTS_DIR = process.env.EXPORTS_DIR || path.resolve(process.cwd(), "storage", "exports");

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const job = await queue.getJob(id);
    if (!job) return res.status(404).json({ id, status: "not_found" });

    const state = await job.getState();
    let resultUrl: string | undefined;

    if (state === "completed") {
      // usa o mesmo identificador que o worker usa pra salvar o arquivo
      const base = (job.data && job.data.jobId) ? job.data.jobId : job.id;
      const midi = path.join(EXPORTS_DIR, `${base}.mid`);
      const wav  = path.join(EXPORTS_DIR, `${base}.wav`);
      if (fs.existsSync(midi)) resultUrl = `/exports/${base}.mid`;
      else if (fs.existsSync(wav)) resultUrl = `/exports/${base}.wav`;
      else if ((job as any).returnvalue?.resultUrl) resultUrl = (job as any).returnvalue.resultUrl;
    }

    return res.json({ id, status: state, resultUrl, updatedAt: job.updatedAt ?? job.timestamp });
  } catch (e: any) {
    console.error("[jobs] error:", e);
    return res.status(500).json({ error: e?.message || "erro interno" });
  }
});

export default router;
