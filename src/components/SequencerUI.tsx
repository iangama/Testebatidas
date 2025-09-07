import React, { useMemo, useRef, useState } from "react";

type Track = {
  id: string;
  name: string;
  color: string; // só visual
};

type Props = {
  tracks?: Track[];
  steps?: number;
  isPlaying: boolean;
  currentStep: number; // vindo do clock do Tone ou polling
  bpm: number;

  onToggleStep: (trackId: string, stepIndex: number, active: boolean) => void;
  onPlayPause: () => void;
  onBpmChange: (bpm: number) => void;
  onClear: () => void;
  onRandomize: () => void;
  onCopyPattern: () => void;
  onPastePattern: () => void;
  onMuteToggle?: (trackId: string) => void;
  onSoloToggle?: (trackId: string) => void;

  // estado do padrão atual (para desenhar a grade)
  // true = ativo; false = inativo
  pattern: Record<string, boolean[]>; // trackId -> [bool, bool...]
  muted?: Record<string, boolean>;
  soloed?: Record<string, boolean>;
};

export default function SequencerUI({
  tracks = [
    { id: "kick", name: "Kick", color: "bg-rose-500" },
    { id: "snare", name: "Snare", color: "bg-sky-500" },
    { id: "hihat", name: "Hi-Hat", color: "bg-amber-500" },
    { id: "bass", name: "Bass", color: "bg-emerald-500" },
  ],
  steps = 16,
  isPlaying,
  currentStep,
  bpm,
  onToggleStep,
  onPlayPause,
  onBpmChange,
  onClear,
  onRandomize,
  onCopyPattern,
  onPastePattern,
  onMuteToggle,
  onSoloToggle,
  pattern,
  muted = {},
  soloed = {},
}: Props) {
  const bpmRef = useRef<HTMLInputElement>(null);
  const fourSplit = useMemo(() => [0, 4, 8, 12], []);

  return (
    <div className="space-y-4">
      {/* Barra de transporte */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg font-medium text-white ${
            isPlaying ? "bg-gray-800" : "bg-black"
          } hover:opacity-90`}
          onClick={onPlayPause}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="inline-flex items-center gap-2">
          <label className="text-sm text-gray-600">BPM</label>
          <input
            ref={bpmRef}
            type="number"
            min={40}
            max={240}
            step={1}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-20 rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={onClear}
            title="Limpar"
          >
            Clear
          </button>
          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={onRandomize}
            title="Randomizar"
          >
            Random
          </button>
          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={onCopyPattern}
            title="Copiar padrão"
          >
            Copy
          </button>
          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={onPastePattern}
            title="Colar padrão"
          >
            Paste
          </button>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          Passo: <span className="font-semibold">{(currentStep % steps) + 1}</span> / {steps}
        </div>
      </div>

      {/* Grade do sequenciador */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px] grid" style={{ gridTemplateColumns: `180px repeat(${steps}, minmax(0, 1fr))` }}>
          {/* Cabeçalho vazio + steps */}
          <div></div>
          {Array.from({ length: steps }).map((_, i) => {
            const bar = fourSplit.includes(i) ? "bg-gray-200" : "bg-gray-100";
            const playing = i === (currentStep % steps);
            return (
              <div
                key={`col-${i}`}
                className={`text-center text-[11px] py-1 ${bar} ${playing ? "outline outline-2 outline-black" : ""}`}
              >
                {i + 1}
              </div>
            );
          })}

          {/* Linhas por trilha */}
          {tracks.map((t) => (
            <React.Fragment key={t.id}>
              {/* Lado esquerdo: nome + mute/solo */}
              <div className="flex items-center justify-between pr-2 pl-3 border-b bg-white">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${t.color}`} />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMuteToggle?.(t.id)}
                    className={`px-2 py-1 rounded text-xs border ${
                      muted[t.id] ? "bg-gray-900 text-white" : "bg-white"
                    }`}
                    title="Mute"
                  >
                    M
                  </button>
                  <button
                    onClick={() => onSoloToggle?.(t.id)}
                    className={`px-2 py-1 rounded text-xs border ${
                      soloed[t.id] ? "bg-gray-900 text-white" : "bg-white"
                    }`}
                    title="Solo"
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Células de steps */}
              {Array.from({ length: steps }).map((_, i) => {
                const active = pattern[t.id]?.[i] ?? false;
                const bar = fourSplit.includes(i) ? "bg-gray-50" : "bg-white";
                const playing = i === (currentStep % steps);

                return (
                  <button
                    key={`${t.id}-${i}`}
                    onClick={() => onToggleStep(t.id, i, !active)}
                    className={`h-10 border-b border-l transition-colors ${
                      active ? t.color + " text-white" : bar
                    } ${playing ? "ring-2 ring-black" : ""}`}
                    title={`${t.name} • Step ${i + 1}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
