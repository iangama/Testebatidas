import React, { useCallback, useEffect, useState } from "react";
import Sequencer from "./components/Sequencer";
import axios from "axios";

const api = axios.create({ baseURL: (import.meta as any).env?.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : "/api" });
async function createPreset(preset: any) { return (await api.post("/presets", preset)).data; }
async function enqueueExport(payload: { type: "midi"|"wav"; presetId?: string; arrangement?: any }) { return (await api.post("/export", payload)).data as { id: string }; }
async function getJob(id: string) { return (await api.get(`/jobs/${id}`)).data; }

export default function App(){
  const [bpm, setBpm] = useState(90);
  const [arr, setArr] = useState<any>(null);
  const [jobId, setJobId] = useState<string|undefined>();
  const [job, setJob] = useState<any>(null);
  const onChange = useCallback((a:any)=> setArr(a), []);

  async function savePreset(){ if (!arr) return; const res = await createPreset({ name: `Preset ${Date.now()}`, style: arr.style, bpm: arr.bpm, pattern: arr }); alert("Preset salvo: "+res.id); }
  async function exportFile(type:"midi"|"wav"){ if (!arr) return; const { id } = await enqueueExport({ type, arrangement: arr }); setJobId(id); }

  useEffect(()=>{ let t: any;
    async function poll(){ if (!jobId) return; const j = await getJob(jobId); setJob(j);
      if (j.status === "completed" || j.status === "failed") return; t = setTimeout(poll, 1000);
    }
    poll(); return ()=> clearTimeout(t);
  }, [jobId]);

  return (
    <div style={{maxWidth:900, margin:"40px auto", display:"grid", gap:16}}>
      <h1>BeatGen</h1>
      <label>BPM: <input type="number" value={bpm} onChange={(e)=>setBpm(parseInt(e.target.value||"90"))} /></label>
      <Sequencer bpm={bpm} onChange={onChange} />
      <div style={{display:"flex", gap:8}}>
        <button onClick={()=>savePreset()}>Salvar preset</button>
        <button onClick={()=>exportFile("midi")}>Exportar MIDI</button>
        <button onClick={()=>exportFile("wav")}>Exportar WAV</button>
      </div>
      {job && (
        <div>
          <p>Status: <b>{job.status}</b></p>
          {job.resultUrl && (<p>Arquivo: <a href={job.resultUrl} target="_blank" rel="noreferrer">baixar</a></p>)}
          {job.error && <pre>{job.error}</pre>}
        </div>
      )}
    </div>
  );
}
