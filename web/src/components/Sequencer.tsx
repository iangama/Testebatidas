import * as Tone from "tone";
import React, { useEffect, useRef, useState } from "react";

type Step = 0 | 1;
const defaultGrid = (n=16): Step[] => Array.from({length:n},()=>0);
const defaultTracks = [
  { instrument: "kick",  steps: defaultGrid() },
  { instrument: "snare", steps: defaultGrid() },
  { instrument: "hihat", steps: defaultGrid() },
  { instrument: "bass",  steps: defaultGrid() }
];

export default function Sequencer({ bpm, onChange }:{ bpm:number; onChange:(arr:any)=>void }){
  const [tracks, setTracks] = useState(defaultTracks);
  const [isPlaying, setPlaying] = useState(false);
  const indexRef = useRef(0);
  const synthsRef = useRef<{[k:string]: any}>({});

  useEffect(() => { Tone.Transport.bpm.value = bpm; }, [bpm]);

  useEffect(() => {
    const kick  = new Tone.MembraneSynth().toDestination();
    const snare = new Tone.NoiseSynth({ envelope:{ sustain:0.02 }}).toDestination();
    const hihat = new Tone.NoiseSynth({ envelope:{ sustain:0.005 }}).toDestination();
    const bass  = new Tone.Synth().toDestination();
    synthsRef.current = { kick, snare, hihat, bass };
    return () => Object.values(synthsRef.current).forEach((s: any) => s.dispose());
  }, []);

  useEffect(()=>{ onChange({ bpm, style:"custom", tracks }); }, [tracks, bpm, onChange]);

  useEffect(() => {
    const loop = new Tone.Loop((time) => {
      tracks.forEach(tr => {
        if (tr.steps[indexRef.current]) {
          const s = synthsRef.current[tr.instrument];
          if (!s) return;
          if (tr.instrument === "kick") s.triggerAttackRelease("C2", "8n", time);
          else if (tr.instrument === "snare" || tr.instrument === "hihat") s.triggerAttackRelease("8n", time);
          else s.triggerAttackRelease("C2", "8n", time);
        }
      });
      indexRef.current = (indexRef.current + 1) % 16;
    }, "16n").start(0);
    return () => { loop.dispose(); };
  }, [tracks]);

  async function togglePlay(){
    await Tone.start();
    setPlaying(p => { if (!p) { indexRef.current = 0; Tone.Transport.start(); } else Tone.Transport.stop(); return !p; });
  }

  function flip(iTrack:number, iStep:number){
    setTracks(ts => ts.map((t,idx)=> idx!==iTrack? t : ({...t, steps: t.steps.map((s,j)=> j===iStep? (s?0:1):s)})));
  }

  return (
    <div style={{display:"grid", gap:8}}>
      <button onClick={togglePlay}>{isPlaying?"Parar":"Play"}</button>
      <div style={{display:"grid", gap:6}}>
        {tracks.map((t, ti) => (
          <div key={t.instrument} style={{display:"grid", gridTemplateColumns:"80px repeat(16, 1fr)", gap:4, alignItems:"center"}}>
            <strong>{t.instrument}</strong>
            {t.steps.map((s, si) => (
              <button key={si} onClick={()=>flip(ti,si)} style={{height:28, opacity:s?1:0.3}}>{si+1}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
