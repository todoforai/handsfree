// Push-to-talk: mic (parecord/arecord, 24 kHz s16le mono) -> Muse Voice Transcribe realtime WS.
// Resolves with the final transcript after the user presses Enter.
// https://dev.meta.ai/docs/api-reference/voice/realtime
import { need } from "../meta/client";

const RATE = 24_000;
const FRAME_BYTES = (RATE * 2 * 80) / 1000; // 80 ms

export async function listenOnce(onPartial?: (t: string) => void): Promise<string> {
  const ws = new WebSocket(`wss://api.meta.ai/v1/asr/realtime?sessionId=handsfree-${crypto.randomUUID()}`);
  const finals: string[] = [];
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));

  await new Promise<void>((open, fail) => { ws.onopen = () => open(); ws.onerror = (e) => fail(e); });
  ws.send(JSON.stringify({
    authorization: { accessToken: `Bearer ${need("MODEL_API_KEY")}` },
    audioEncoding: "PCM_24KHZ",
    model: "muse-voice-transcribe-1.0",
    mode: "PUSH_TO_TALK",
  }));
  ws.onmessage = (ev) => {
    if (typeof ev.data !== "string") return;
    const m = JSON.parse(ev.data);
    if (m.type === "error") throw new Error(m.message);
    if (m.type === "transcript") (m.final ? finals.push(m.transcript) : onPartial?.(m.transcript));
  };
  ws.onclose = () => resolveDone();

  const rec = Bun.spawn(["parecord", "--raw", "--format=s16le", "--rate=24000", "--channels=1"], { stdout: "pipe", stderr: "ignore" });
  const pump = (async () => {
    const reader = rec.stdout.getReader();
    let buf = new Uint8Array(0);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf = concat(buf, value);
      while (buf.length >= FRAME_BYTES) { ws.send(buf.slice(0, FRAME_BYTES)); buf = buf.slice(FRAME_BYTES); }
    }
  })();

  process.stderr.write("🎤 speak, then press Enter… ");
  for await (const _ of console) break;
  rec.kill();
  await pump.catch(() => {});
  ws.send(JSON.stringify({ type: "endStream" }));
  await done;
  return finals.join(" ").trim();
}

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out;
}
