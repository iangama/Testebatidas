import { useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import "./index.css";

const STEPS = 16;
const makeRow = (fill = []) => Array.from({ length: STEPS }, (_, i) => fill.includes(i));
const toIdx = (row) => row.map((v,i)=>v?i:null).filter(v=>v!==null);

const STYLES = [
  { id:"lofi", name:"Lo-Fi", defaultBpm:82, seed:{kick:[0,8,12], snare:[4,12], hihat:[...Array(STEPS).keys()]} },
  { id:"trap", name:"Trap", defaultBpm:140, seed:{kick:[0,6,10,14], snare:[4,12], hihat:[...Array(STEPS).keys()]} },
  { id:"rock", name:"Rock", defaultBpm:110, seed:{kick:[0,8], snare:[4,12], hihat:[0,2,4,6,8,10,12,14]} },
];

const seedToPattern = (s)=>({ kick:makeRow(s.kick), snare:makeRow(s.snare), hihat:makeRow(s.hihat) });

export default function App(){
  const [style, setStyle] = useState(STYLES[0]);
  const [bpm, setBpm] = useState(STYLES[0].defaultBpm);
  const [pattern, setPat] = useState(seedToPattern(STYLES[0].seed));
  const [isPlaying, setOn] = useState(false);
  const [step, setStep] = useState(0);

  const accent = useMemo(()=> Array.from({length:STEPS}, (_,i)=> i%4===0 ? 1.0 : 0.75), []);

  const limiter = useMemo(()=> new Tone.Limiter(-1).toDestination(), []);
  const compressor = useMemo(()=> new Tone.Compressor({ threshold:-16, ratio:3 }).connect(limiter), [limiter]);

  // Players com samples (se existirem)
  const players = useMemo(()=>{
    const p = new Tone.Players({
      urls: { kick: "kick.wav", snare:"snare.wav", hihat:"hihat.wav" },
      baseUrl: "/samples/",
      fadeOut: 0.02,
    });
    const gKick = new Tone.Gain(1).connect(compressor);
    const gSnare = new Tone.Gain(1).connect(compressor);
    const gHat = new Tone.Gain(1).connect(compressor);
    p.player("kick").connect(gKick);
    p.player("snare").connect(gSnare);
    p.player("hihat").connect(gHat);
    return { p, gKick, gSnare, gHat };
  }, [compressor]);

  // synths de fallback
  const fallback = useMemo(()=>{
    const k = new Tone.MembraneSynth({ octaves:2, pitchDecay:0.04, envelope:{ attack:0.001, decay:0.28, sustain:0, release:0.12 }}).connect(compressor);
    const sn = new Tone.NoiseSynth({ envelope:{ attack:0.001, decay:0.16, sustain:0, release:0.04 }});
    const snHP = new Tone.Filter(6000,"highpass"); sn.chain(snHP, compressor);
    const hh = new Tone.NoiseSynth({ envelope:{ attack:0.001, decay:0.03, sustain:0 }});
    const hhHP = new Tone.Filter(9000,"highpass"); hh.chain(hhHP, compressor);
    return { k, sn, hh };
  }, [compressor]);

  const recorder = useMemo(()=> new Tone.Recorder(), []);
  const destRef = useRef(null);

  useEffect(()=>{
    Tone.getTransport().bpm.value = bpm;
    Tone.Transport.swing = 0.55;
    Tone.Transport.swingSubdivision = "8n";
  }, [bpm]);

  useEffect(()=>{
    destRef.current = Tone.Destination;
    destRef.current.connect(recorder);
    return ()=> destRef.current?.disconnect(recorder);
  }, [recorder]);

  useEffect(()=>{
    Tone.Transport.cancel();
    Tone.Transport.scheduleRepeat((time)=>{
      const i = (Math.floor(Tone.Transport.ticks / Tone.Ticks("16n")) % STEPS);
      setStep(i);
      const vel = accent[i];
      const jitter = (Math.random()*0.008) - 0.004; // ±4ms
      const has = players.p.player("kick").loaded || players.p.player("snare").loaded || players.p.player("hihat").loaded;

      if (pattern.kick[i]){
        if (has) { players.gKick.gain.rampTo(vel, 0.001); players.p.player("kick").start(time + jitter); }
        else { fallback.k.volume.value = -4 + (vel-1)*6; fallback.k.triggerAttackRelease("C1","8n", time + jitter); }
      }
      if (pattern.snare[i]){
        if (has) { players.gSnare.gain.rampTo(vel, 0.001); players.p.player("snare").start(time + jitter); }
        else { fallback.sn.volume.value = -8 + (vel-1)*8; fallback.sn.triggerAttackRelease("16n", time + jitter); }
      }
      if (pattern.hihat[i]){
        if (has) { players.gHat.gain.rampTo(vel*0.9, 0.001); players.p.player("hihat").start(time + jitter); }
        else { fallback.hh.volume.value = -10 + (vel-1)*8; fallback.hh.triggerAttackRelease("32n", time + jitter); }
      }
    }, "16n");
  }, [pattern, accent, players, fallback]);

  async function start(){ await Tone.start(); setStep(0); Tone.Transport.start("+0.02"); setOn(true); }
  function stop(){ Tone.Transport.stop(); setOn(false); setStep(0); }

  function toggle(row, i){ setPat(p=>({ ...p, [row]: p[row].map((v,ix)=> ix===i ? !v : v) })); }
  function clear(row){ setPat(p=>({ ...p, [row]: Array(STEPS).fill(false) })); }
  function fill(row, n){ setPat(p=>({ ...p, [row]: Array.from({length:STEPS},(_,i)=> i%n===0) })); }
  function randomize(){
    const rnd=(prob)=> Array.from({length:STEPS},()=> Math.random()<prob);
    setPat({
      kick:  rnd(style.id==="trap"?0.22:0.18),
      snare: Array.from({length:STEPS},(_,i)=> i===4 || i===12),
      hihat: rnd(style.id==="rock"?0.55:0.85),
    });
    setBpm(style.defaultBpm);
  }
  function applyStyle(s){ setStyle(s); setBpm(s.defaultBpm); setPat(seedToPattern(s.seed)); }

  async function exportWav(){
    await Tone.start();
    Tone.Transport.stop(); setStep(0);
    Tone.Transport.start(); recorder.start();
    await Tone.now() + 4.0;
    const blob = await recorder.stop();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `beat-${Date.now()}.wav`; a.click();
  }
  async function exportMidi(){
    const res = await fetch("/api/export/midi", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ bpm, pattern:{
        kick:toIdx(pattern.kick), snare:toIdx(pattern.snare), hihat:toIdx(pattern.hihat)
      }})
    });
    const data = await res.json();
    if (data?.resultUrl){ const a=document.createElement("a"); a.href=data.resultUrl; a.download=`beat-${data.id}.mid`; a.click(); }
    else alert("Falha ao exportar MIDI");
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-50">
      <header className="sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="title">BeatGen <span className="text-zinc-400">• Docker</span></h1>
          <div className="flex gap-2">
            {!isPlaying ? <button className="btn" onClick={start}>▶ Play</button> : <button className="btn" onClick={stop}>⏹ Stop</button>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <section className="card space-y-4">
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s=>(
              <button key={s.id} className={`chip ${style.id===s.id?"chip-active":""}`} onClick={()=>applyStyle(s)}>{s.name}</button>
            ))}
            <button className="chip" onClick={randomize}>Aleatorizar</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="label">BPM</span>
            <input type="range" min="60" max="180" value={bpm} onChange={e=>setBpm(parseInt(e.target.value))} className="w-64 accent-zinc-200"/>
            <span className="font-semibold">{bpm}</span>
          </div>
        </section>

        <section className="card">
          <div className="grid grid-cols-[110px_repeat(16,minmax(0,1fr))] gap-1">
            {["kick","snare","hihat"].map((rowKey, idx)=>(
              <div className="contents" key={rowKey}>
                <div className="pr-3 flex items-center justify-between">
                  <div className="text-sm text-zinc-300 font-medium">{rowKey.toUpperCase()}</div>
                  <div className="flex gap-1">
                    <button className="mini" onClick={()=>clear(rowKey)}>Limpar</button>
                    <button className="mini" onClick={()=>fill(rowKey,2)}>x/2</button>
                    <button className="mini" onClick={()=>fill(rowKey,4)}>x/4</button>
                  </div>
                </div>
                {pattern[rowKey].map((on,i)=>(
                  <button
                    key={rowKey + "-" + i}
                    onClick={()=>setPat(p=>({ ...p, [rowKey]: p[rowKey].map((v,ix)=> ix===i ? !v : v) }))}
                    className={[
                      "h-10 rounded-md border transition text-transparent",
                      i===step ? "ring-2 ring-zinc-300" : "",
                      on
                        ? (idx===0 ? "bg-emerald-500" : idx===1 ? "bg-rose-500" : "bg-yellow-400") + " border-transparent shadow"
                        : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                    ].join(" ")}
                  >.</button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="card flex flex-wrap items-center gap-3">
          <span className="label">Exportar</span>
          <button className="btn" onClick={exportWav}>Exportar .wav (cliente)</button>
          <button className="btn" onClick={exportMidi}>Exportar .midi (backend)</button>
          <p className="text-sm text-zinc-400 ml-auto">Coloque <code>kick.wav</code>, <code>snare.wav</code>, <code>hihat.wav</code> em <code>/samples</code>.</p>
        </section>
      </main>
    </div>
  );
}
