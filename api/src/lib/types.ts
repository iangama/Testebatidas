export type Step = 0 | 1;
export type Track = { instrument: string; steps: Step[] };
export type Arrangement = { bpm: number; style: string; tracks: Track[] };
