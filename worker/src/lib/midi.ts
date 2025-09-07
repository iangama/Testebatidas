import { Midi } from "@tonejs/midi";
import type { Arrangement } from "./types";

export function arrangementToMidi(arr: Arrangement): Buffer {
  const midi = new Midi();
  midi.header.setTempo(arr.bpm);
  const ticksPerStep = 120;
  for (const tr of arr.tracks) {
    const t = midi.addTrack();
    let n = 36; if (tr.instrument === "snare") n = 38; else if (tr.instrument === "hihat") n = 42; else if (tr.instrument === "bass") n = 32;
    tr.steps.forEach((s, i) => { if (s) t.addNote({ midi: n, time: i * (ticksPerStep / midi.header.ppq), duration: 0.2 }); });
  }
  return Buffer.from(midi.toArray());
}
