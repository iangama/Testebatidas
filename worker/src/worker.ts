import "dotenv/config";
import { Worker } from "bullmq";
import { promises as fs } from "fs";
import { join } from "path";
import { exec } from "./lib/exec";
import { arrangementToMidi } from "./lib/midi";

const connection = { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT || 6379) } as const;
const queueName = "exports";
const exportDir = process.env.EXPORT_DIR || "/app/storage/exports";
const sf2 = process.env.SOUNDFONT_PATH || "/app/assets/soundfont/FluidR3_GM.sf2";

const w = new Worker(queueName, async (job) => {
  const { jobId } = job.data as { jobId: string };
  const metaJson = join(exportDir, `${jobId}.json`);
  let payload: any = null;
  try { payload = JSON.parse(await fs.readFile(metaJson, "utf8")); }
  catch { payload = { type: "midi", arrangement: { bpm: 90, style: "lofi", tracks: [] } }; }

  const type = payload.type as "midi" | "wav";
  const arr = payload.arrangement as { bpm: number; style: string; tracks: { instrument: string; steps: (0|1)[] }[] };

  const midiBuf = arrangementToMidi(arr);
  const midiPath = join(exportDir, `${jobId}.mid`);
  await fs.writeFile(midiPath, midiBuf);

  if (type === "midi") return { result: `/exports/${jobId}.mid` };

  const wavPath = join(exportDir, `${jobId}.wav`);
  const cmd = `fluidsynth -ni ${sf2} ${midiPath} -F ${wavPath} -r 44100`;
  await exec(cmd);
  return { result: `/exports/${jobId}.wav` };
}, { connection });

w.on("completed", (job, res) => console.log("Export completed", job.id, res));
w.on("failed", (job, err) => console.error("Export failed", job?.id, err));
console.log("Worker started");
