import { Router } from "express";
import { Queue } from "bullmq";
import crypto from "node:crypto";

const router = Router();
const connection = { url: process.env.REDIS_URL || "redis://redis:6379" };
const queueName = process.env.EXPORT_QUEUE || "exports";
const queue = new Queue(queueName, { connection });

router.post("/", async (req, res) => {
  try {
    const { kind, payload } = req.body ?? {};
    if (kind !== "midi" && kind !== "wav") {
      return res.status(400).json({ error: "kind inválido (midi|wav)" });
    }
    if (!payload) return res.status(400).json({ error: "payload ausente" });

    // Gera um ID e envia dentro do data E como jobId do BullMQ
    const id = crypto.randomUUID();
    const job = await queue.add(
      "export",
      { jobId: id, kind, payload },
      { jobId: id, removeOnComplete: true, removeOnFail: false }
    );

    return res.status(202).json({ id: job.id });
  } catch (e: any) {
    console.error("[exports] error:", e);
    return res.status(500).json({ error: e?.message || "erro interno" });
  }
});

export default router;
