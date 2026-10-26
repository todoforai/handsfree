#!/usr/bin/env bun
// handsfree "task"            run a task on the phone
// handsfree --voice           push-to-talk, then run
// handsfree --locate "concept" SAM grounding experiment on the current screen
import { AndroidDriver } from "./src/drivers/android";
import { runTask } from "./src/cua/loop";
import { plannerFromEnv } from "./src/meta/client";
import { listenOnce } from "./src/voice/listen";
import { locate } from "./src/grounding/sam";

const args = process.argv.slice(2);
const flag = (f: string) => { const i = args.indexOf(f); return i >= 0 ? (args.splice(i, 1), true) : false; };
const voice = flag("--voice");
const doLocate = flag("--locate");
const dryRun = flag("--dry-run");

const driver = new AndroidDriver();
await driver.init();

if (doLocate) {
  const shot = await driver.screenshot();
  await Bun.write("screen.png", shot.png);
  console.log(JSON.stringify(await locate(shot, args.join(" ")), null, 2));
  process.exit(0);
}

const task = voice ? await listenOnce((t) => process.stderr.write(`\r   ${t}`)) : args.join(" ");
if (!task) { console.error("no task"); process.exit(1); }
console.log(`\n▶ ${task}`);

const runDir = `runs/${new Date().toISOString().replace(/[:.]/g, "-")}`;
const result = await runTask(task, driver, plannerFromEnv(), {
  runDir,
  confirm: async (checks) => {
    console.log("⚠ safety check:", checks.map((c) => c.message).join("; "));
    if (dryRun) return false;
    process.stdout.write("continue? [y/N] ");
    for await (const line of console) return line.trim().toLowerCase() === "y";
    return false;
  },
  onStep: ({ step, call, text }) => {
    if (call) console.log(`#${step}`, call.actions.map((a) => a.type === "type" ? `type "${a.text}"` : a.type).join(", "));
    if (text) console.log(`#${step} 💬 ${text}`);
  },
});
console.log("✔", result, `(log: ${runDir})`);
