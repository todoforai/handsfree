// Meta Model API client. OpenAI-compatible Responses API at https://api.meta.ai/v1.
// Kept dependency-free: plain fetch so the same code runs under Bun or Node 18+.

export const META_BASE = "https://api.meta.ai/v1";

export type Planner = { baseURL: string; apiKey: string; model: string };

export function plannerFromEnv(): Planner {
  const spec = process.env.HANDSFREE_PLANNER ?? "muse-wonder-1.0";
  if (spec.startsWith("baseten:")) {
    return {
      baseURL: "https://inference.baseten.co/v1",
      apiKey: need("BASETEN_API_KEY"),
      model: spec.slice("baseten:".length),
    };
  }
  return { baseURL: META_BASE, apiKey: need("MODEL_API_KEY"), model: spec };
}

export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
}

export async function metaFetch<T>(p: Planner, path: string, body: unknown): Promise<T> {
  const res = await fetch(p.baseURL + path, {
    method: "POST",
    headers: { authorization: `Bearer ${p.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function dataUrl(png: Uint8Array, mime = "image/png"): string {
  return `data:${mime};base64,${Buffer.from(png).toString("base64")}`;
}
