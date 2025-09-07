const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

async function fetchWithFallback(paths: string[], init?: RequestInit) {
  let lastErr: any = null;
  for (const p of paths) {
    const url =
      API_BASE
        ? `${API_BASE}${p}`
        : p; // se tiver proxy no Vite, pode usar só p (ex.: /api/presets)
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // se 404, tenta próximo caminho
      if (res.status === 404) {
        lastErr = new Error(`404 em ${url}`);
        continue;
      }
      // para outros status, lança direto
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status} em ${url}`);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error("Falha em todas as rotas");
}

type PresetPayload = {
  bpm: number;
  steps: number;
  tracks: { id: string; name: string }[];
  pattern: Record<string, boolean[]>;
};

type ExportKind = "midi" | "wav";

export async function savePreset(payload: PresetPayload) {
  const res = await fetchWithFallback(
    ["/api/presets", "/presets"],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export async function startExport(kind: ExportKind, payload: PresetPayload) {
  const res = await fetchWithFallback(
    ["/api/exports", "/exports"],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    }
  );
  return res.json() as Promise<{ id: string }>;
}

export async function getJobStatus(jobId: string) {
  const paths = [`/api/jobs/${jobId}`, `/jobs/${jobId}`];
  const res = await fetchWithFallback(paths, { method: "GET" });
  return res.json() as Promise<{
    id: string;
    status: "queued" | "active" | "completed" | "failed" | "delayed" | "waiting";
    resultUrl?: string;
    error?: string;
    updatedAt?: string;
  }>;
}

export async function pollJobUntilDone(
  jobId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
) {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const intervalMs = opts.intervalMs ?? 800;
  const start = Date.now();

  while (true) {
    const s = await getJobStatus(jobId);
    if (s.status === "completed") return s;
    if (s.status === "failed") throw new Error(s.error || "Job falhou");
    if (Date.now() - start > timeoutMs) throw new Error("Timeout ao aguardar export");
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

export function downloadResult(resultUrl: string) {
  const url = API_BASE ? `${API_BASE}${resultUrl}` : resultUrl;
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
