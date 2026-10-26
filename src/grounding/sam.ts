// SAM 3.1 as a UI click oracle: name the target ("blue Send button") and get its box.
// https://dev.meta.ai/docs/sam/segmenting — one concept per request, output is a token
// string with <|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|> records.
import { META_BASE, dataUrl, need } from "../meta/client";
import type { Screenshot } from "../drivers/types";

export type Box = { x1: number; y1: number; x2: number; y2: number };

export async function locate(shot: Screenshot, concept: string): Promise<Box[]> {
  const res = await fetch(`${META_BASE}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${need("MODEL_API_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "sam-3.1",
      stream: false,
      input: [{
        type: "message", role: "user",
        content: [
          { type: "input_text", text: concept },
          { type: "input_image", image_url: dataUrl(shot.png) },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`sam ${res.status}: ${await res.text()}`);
  const json = await res.json() as { output_text?: string; output?: any[] };
  const text = json.output_text ?? extractText(json.output ?? []);
  return parseBoxes(text);
}

export function parseBoxes(text: string): Box[] {
  const boxes: Box[] = [];
  for (const m of text.matchAll(/<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=\d+;h=\d+\|>/g)) {
    boxes.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  }
  return boxes;
}

export const centre = (b: Box) => ({ x: Math.round((b.x1 + b.x2) / 2), y: Math.round((b.y1 + b.y2) / 2) });

function extractText(output: any[]): string {
  return output.flatMap((o) => o.content ?? []).map((c: any) => c.text ?? "").join("");
}
