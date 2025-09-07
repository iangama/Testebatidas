import React, { useEffect, useRef, useState } from "react";
import SequencerUI from "./components/SequencerUI";
import { createToneEngine, type Pattern as EnginePattern } from "./engine/toneEngine";
import { savePreset, startExport, pollJobUntilDone, downloadResult } from "./lib/api";

type Pattern = Record<string, boolean[]>;

const DEFAULT_TRACKS = [
  { id: "kick", name: "Kick", color: "bg-rose-500" },
  { id: "snare", name: "Snare", color: "bg-sky-500" },
  { id: "hihat", name: "Hi-Hat", color: "bg-amber-500" },
  { id: "bass", name: "Bass", color: "bg-emerald-500" },
];

const STEPS = 16;

export default function App() {
  const [status, setStatus] = useState<string>("Pronto");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [pattern, setPattern] = useState<Pattern>(() =>
    Object.fromEntries(DEFAULT_TRACKS.map(t => [t.id, Array(STEPS).fill(false)]))
  );
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [soloed, setSoloed] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState<null | "midi" | "wav">(null);
  const [saving, setSaving] = useState(false);

  const engineRef = useRef<ReturnType<typeof createToneEngine> | null>(null);

  // cria a engine uma vez
  useEffect(() => {
    engineRef.current = createToneEngine({
      tracks: DEFAULT_TRACKS.map(t => ({ id: t.id, name: t.name })),
      steps: STEPS,
      bpm,
      onStep: (s) => setCurrentStep(s),
    });
    engineRef.current.updatePattern(pattern as EnginePattern);
    engineRef.current.updateFlags({ muted, soloed });

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => { engineRef.current?.updatePattern(pattern as EnginePattern); }, [pattern]);
  useEffect(() => { engineRef.current?.updateFlags({ muted, soloed }); }, [muted, soloed]);
  useEffect(() => { engineRef.current?.setBpm(bpm); }, [bpm]);

  // Helpers
  function buildPresetPayload() {
    return {
      bpm,
      steps: STEPS,
      tracks: DEFAULT_TRACKS.map(t => ({ id: t.id, name: t.name })),
      pattern,
    };
  }

  // Sequencer callbacks
  function onToggleStep(trackId: string, stepIndex: number, active: boolean) {
    setPattern(prev => {
      const copy = { ...prev, [trackId]: [...(prev[trackId] ?? [])] };
      copy[trackId][stepIndex] = active;
      return copy;
    });
  }

  async function onPlayPause() {
    if (!isPlaying) {
      await engineRef.current?.play();
      setIsPlaying(true);
    } else {
      engineRef.current?.pause();
      setIsPlaying(false);
    }
  }

  function onBpmChange(next: number) { setBpm(next); }
  function onClear() {
    setPattern(Object.fromEntries(DEFAULT_TRACKS.map(t => [t.id, Array(STEPS).fill(false)])));
  }
  function onRandomize() {
    setPattern(Object.fromEntries(DEFAULT_TRACKS.map(t => [
      t.id,
      Array(STEPS).fill(false).map(() => Math.random() < 0.3)
    ])));
  }
  function onMuteToggle(trackId: string) { setMuted(m => ({ ...m, [trackId]: !m[trackId] })); }
  function onSoloToggle(trackId: string) { setSoloed(s => ({ ...s, [trackId]: !s[trackId] })); }

  // Botões da lateral
  async function handleSavePreset() {
    try {
      setSaving(true);
      setStatus("Salvando preset…");
      await savePreset(buildPresetPayload());
      setStatus("Preset salvo com sucesso.");
    } catch (e: any) {
      setStatus(e?.message ?? "Falha ao salvar preset");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(kind: "midi" | "wav") {
    try {
      setExporting(kind);
      setStatus(`Export ${kind.toUpperCase()} iniciado…`);
      const { id } = await startExport(kind, buildPresetPayload());
      const done = await pollJobUntilDone(id, { timeoutMs: 120_000, intervalMs: 900 });
      if (!done.resultUrl) throw new Error("Export concluído, mas sem URL do resultado.");
      setStatus(`Export ${kind.toUpperCase()} concluído. Baixando…`);
      downloadResult(done.resultUrl);
      setStatus(`Arquivo baixado: ${done.resultUrl}`);
    } catch (e: any) {
      setStatus(e?.message ?? "Falha no export");
    } finally {
      setExporting(null);
    }
  }

  // UI
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">🎵 BeatGen</h1>
          <div className="text-sm text-gray-600">{status}</div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 rounded-xl border bg-white shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Sequenciador</h2>
            </div>
            <div className="p-6">
              <SequencerUI
                tracks={DEFAULT_TRACKS}
                steps={STEPS}
                isPlaying={isPlaying}
                currentStep={currentStep}
                bpm={bpm}
                onToggleStep={onToggleStep}
                onPlayPause={onPlayPause}
                onBpmChange={onBpmChange}
                onClear={onClear}
                onRandomize={onRandomize}
                onCopyPattern={() => {}}
                onPastePattern={() => {}}
                onMuteToggle={onMuteToggle}
                onSoloToggle={onSoloToggle}
                pattern={pattern}
                muted={muted}
                soloed={soloed}
              />
            </div>
          </section>

          <aside className="rounded-xl border bg-white shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Ações</h2>
            </div>
            <div className="p-4 space-y-3">
              <button
                className="w-full inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
                onClick={handleSavePreset}
                disabled={saving || exporting !== null}
              >
                {saving ? "Salvando…" : "Salvar Preset"}
              </button>
              <button
                className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
                onClick={() => handleExport("midi")}
                disabled={saving || exporting !== null}
              >
                {exporting === "midi" ? "Exportando MIDI…" : "Exportar MIDI"}
              </button>
              <button
                className="w-full inline-flex items-center justify-center rounded-lg bg-gray-200 text-gray-900 px-4 py-2 font-medium hover:bg-gray-300 disabled:opacity-60"
                onClick={() => handleExport("wav")}
                disabled={saving || exporting !== null}
              >
                {exporting === "wav" ? "Exportando WAV…" : "Exportar WAV"}
              </button>

              <div className="mt-2 text-sm text-gray-600">
                Feedback: <span className="font-medium">{status}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 text-sm text-gray-500 text-center">
          BeatGen © 2025
        </div>
      </footer>
    </div>
  );
}
