import "dotenv/config";
import { Worker } from "bullmq";
import { promises as fs } from "fs";
import { join } from "path";
import { Midi } from "@tonejs/midi";

const connection = {
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT || 6379),
};

const exportDir = process.env.EXPORT_DIR || "/app/storage/exports";

async function writeMidi(jobId: string, arrangement: any) {
  const midi = new Midi();
  const tempo = typeof arrangement?.bpm === "number" ? arrangement.bpm : 90;
  midi.header.setTempo(tempo);

  const kick = midi.addTrack(); kick.name = "Kick";
  const snr  = midi.addTrack(); snr.name  = "Snare";
  const hat  = midi.addTrack(); hat.name  = "Hihat";

  for (let bar = 0; bar < 1; bar++) {
    const base = bar * 4;
    kick.addNote({ midi: 36, time: base + 0, duration: 0.5, velocity: 0.9 });
    kick.addNote({ midi: 36, time: base + 2, duration: 0.5, velocity: 0.9 });
    snr.addNote({ midi: 38, time: base + 1, duration: 0.5, velocity: 0.9 });
    snr.addNote({ midi: 38, time: base + 3, duration: 0.5, velocity: 0.9 });
    for (let step = 0; step < 8; step++) {
      hat.addNote({ midi: 42, time: base + step * 0.5, duration: 0.25, velocity: 0.6 });
    }
  }

  const out = join(exportDir, `${jobId}.mid`);
  await fs.writeFile(out, Buffer.from(midi.toArray()));
  return out;
}

const w = new Worker("exports", async (job) => {
  const jobId = job.data?.jobId as string;
  if (!jobId) throw new Error("jobId ausente no payload do job");

  // ler snapshot salvo pela API
  const snapshotPath = join(exportDir, `${jobId}.json`);
  let payload: any = {};
  try {
    const raw = await fs.readFile(snapshotPath, "utf-8");
    payload = JSON.parse(raw);
  } catch {/* segue com defaults */}

  const type = payload?.type || "midi";
  const out = await writeMidi(jobId, payload?.arrangement);
  return { ok: true, type, out };
}, { connection });

w.on("ready", () => console.log("[worker] pronto, conectado ao Redis"));
w.on("completed", (job, ret) => console.log("[worker] completed", job.id, ret));
w.on("failed", (job, err) => console.error("[worker] failed", job?.id, err));
