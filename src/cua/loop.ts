// Observe-act loop over the Responses API with the native `computer` tool,
// plus a `locate` function tool that grounds targets with SAM 3.1.
import { metaFetch, dataUrl, type Planner } from "../meta/client";
import type { ComputerCall, Driver, SafetyCheck, Screenshot } from "../drivers/types";
import { locate, centre } from "../grounding/sam";

export type LoopOptions = {
  maxSteps?: number;
  /** Return true to acknowledge the checks and continue; false aborts the run. */
  confirm?: (checks: SafetyCheck[]) => Promise<boolean>;
  onStep?: (info: { step: number; call?: ComputerCall; shot: Screenshot; text?: string }) => void;
  runDir?: string;
};

const SYSTEM = `You control a real device through screenshots.
Rules: act only toward the user's task; one screen at a time; prefer the locate tool
(short noun phrase like "blue Send button") to get exact coordinates for small targets
before clicking; never enter payment or password data unless the task says so;
when the task is complete, reply with a one-line summary and stop issuing actions.`;

const LOCATE_TOOL = {
  type: "function",
  name: "locate",
  description: "Find a UI element on the current screenshot by a short noun phrase and return its box and centre in screenshot pixels.",
  parameters: {
    type: "object",
    properties: { concept: { type: "string", description: 'e.g. "blue Send button", "search field", "back arrow"' } },
    required: ["concept"],
    additionalProperties: false,
  },
};

export async function runTask(task: string, driver: Driver, planner: Planner, opts: LoopOptions = {}): Promise<string> {
  const maxSteps = opts.maxSteps ?? 40;
  let shot = await driver.screenshot();
  let input: unknown[] = [
    { role: "developer", content: SYSTEM },
    { role: "user", content: [
      { type: "input_text", text: task },
      { type: "input_image", image_url: dataUrl(shot.png) },
    ] },
  ];
  let previous: string | undefined;

  for (let step = 1; step <= maxSteps; step++) {
    const res = await metaFetch<any>(planner, "/responses", {
      model: planner.model,
      tools: [{ type: "computer" }, LOCATE_TOOL],
      input,
      previous_response_id: previous,
    });
    previous = res.id;
    if (opts.runDir) await Bun.write(`${opts.runDir}/step-${step}.json`, JSON.stringify(res, null, 2));

    const calls = (res.output ?? []).filter((o: any) => o.type === "computer_call") as ComputerCall[];
    const fnCalls = (res.output ?? []).filter((o: any) => o.type === "function_call");
    const text = res.output_text ?? "";
    opts.onStep?.({ step, call: calls[0], shot, text });

    if (!calls.length && !fnCalls.length) return text || "(no final message)";

    input = [];
    for (const fc of fnCalls) {
      const { concept } = JSON.parse(fc.arguments);
      const boxes = await locate(shot, concept);
      input.push({ type: "function_call_output", call_id: fc.call_id, output: JSON.stringify(boxes.map((b) => ({ ...b, centre: centre(b) }))) });
    }
    for (const call of calls) {
      if (call.pending_safety_checks.length) {
        const ok = opts.confirm ? await opts.confirm(call.pending_safety_checks) : false;
        if (!ok) return `aborted: ${call.pending_safety_checks.map((c) => c.message).join("; ")}`;
      }
      for (const a of call.actions) {
        try { await driver.execute(a); } catch (e) { console.error("action failed, resyncing:", e); break; }
      }
      shot = await driver.screenshot();
      input.push({
        type: "computer_call_output",
        call_id: call.call_id,
        acknowledged_safety_checks: call.pending_safety_checks,
        output: { type: "computer_screenshot", image_url: dataUrl(shot.png) },
      });
    }
  }
  return `stopped after ${maxSteps} steps`;
}
