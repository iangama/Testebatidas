import type { Arrangement } from "./types";
import { Midi } from "@tonejs/midi";

export function arrangementToMidi(arr: Arrangement): Buffer {
  const midi = new Midi();
  midi.header.setTempo(arr.bpm);
  const ticksPerStep = 120;

  for (const tr of arr.tracks) {
    const track = midi.addTrack();
    let midiNumber = 36; // kick
    if (tr.instrument === "snare") midiNumber = 38;
    else if (tr.instrument === "hihat") midiNumber = 42;
    else if (tr.instrument === "bass") midiNumber = 32;
    tr.steps.forEach((s, i) => {
      if (s) {
        track.addNote({
          midi: midiNumber,
          time: (i * ticksPerStep) / midi.header.ppq,
          duration: 0.2
        });
      }
    });
  }
  return Buffer.from(midi.toArray());
}
