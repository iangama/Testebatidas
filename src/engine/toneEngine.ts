import * as Tone from "tone";

export type TrackDef = { id: string; name: string };

export type Pattern = Record<string, boolean[]>;
export type Flags = { muted: Record<string, boolean>; soloed: Record<string, boolean> };

type EngineOpts = {
  tracks: TrackDef[];
  steps: number;
  bpm: number;
  // chamado a cada avanço de step para atualizar UI
  onStep: (step: number) => void;
};

// instrumentos básicos
function makeInstruments(tracks: TrackDef) {
  const inst: Record<string, any> = {};

  // Kick
  inst["kick"] = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  }).toDestination();

  // Snare
  inst["snare"] = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
  }).toDestination();

  // Hi-Hat
  inst["hihat"] = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
  }).toDestination();

  // Bass
  inst["bass"] = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.2, release: 0.2, baseFrequency: 80, octaves: 2.5 },
  }).toDestination();

  return inst;
}

// nota do baixo por step (bem simples)
const BASS_NOTES = ["C2","C2","G1","G1","F2","F2","C2","C2","C2","C2","G1","G1","F2","F2","G1","G1"];

export function createToneEngine({ tracks, steps, bpm, onStep }: EngineOpts) {
  let pattern: Pattern = {};
  let flags: Flags = { muted: {}, soloed: {} };
  let tickId: number | null = null;
  const instruments = makeInstruments(tracks);

  // helpers solo/mute
  function isAudible(trackId: string) {
    const anySolo = Object.values(flags.soloed).some(Boolean);
    if (anySolo) return !!flags.soloed[trackId]; // só os soloados tocam
    return !flags.muted[trackId]; // se não há solo, mutados não tocam
  }

  async function ensureAudio() {
    // Regras de autoplay: precisa ser chamado após gesto do usuário (ex.: clique no Play)
    await Tone.start();
    await Tone.getContext().resume();
  }

  function schedule(bpmValue: number) {
    Tone.Transport.bpm.value = bpmValue;
    // apaga agendamentos antigos
    if (tickId !== null) {
      Tone.Transport.clear(tickId as any);
      tickId = null;
    }
    let step = 0;
    tickId = Tone.Transport.scheduleRepeat((time) => {
      // dispara de acordo com pattern atual
      tracks.forEach((t) => {
        const cellActive = pattern[t.id]?.[step] ?? false;
        if (!cellActive) return;
        if (!isAudible(t.id)) return;

        // toca instrumentos
        if (t.id === "kick") {
          (instruments["kick"] as Tone.MembraneSynth).triggerAttackRelease("C1", "8n", time);
        } else if (t.id === "snare") {
          (instruments["snare"] as Tone.NoiseSynth).triggerAttackRelease("8n", time);
        } else if (t.id === "hihat") {
          (instruments["hihat"] as Tone.NoiseSynth).triggerAttackRelease("16n", time);
        } else if (t.id === "bass") {
          const note = BASS_NOTES[step % BASS_NOTES.length];
          (instruments["bass"] as Tone.MonoSynth).triggerAttackRelease(note, "8n", time);
        }
      });

      onStep(step); // avança UI
      step = (step + 1) % steps;
    }, "16n"); // 16 steps por compasso
  }

  return {
    async play() {
      await ensureAudio();
      schedule(Tone.Transport.bpm.value);
      if (Tone.Transport.state !== "started") Tone.Transport.start();
    },
    pause() {
      Tone.Transport.pause();
    },
    setBpm(next: number) {
      schedule(next);
    },
    updatePattern(next: Pattern) {
      pattern = next;
    },
    updateFlags(next: Flags) {
      flags = next;
    },
    dispose() {
      if (tickId !== null) {
        Tone.Transport.clear(tickId as any);
        tickId = null;
      }
      Object.values(instruments).forEach((i) => i?.dispose?.());
    }
  };
}
