# Handsfree — concept

**One line:** Talk to your own phone and computer. Muse Voice Transcribe hears you, Muse Spark decides, SAM 3.1 finds the exact pixel to tap, and the agent runs on your real devices — no cloud VM, no emulator.

Meta Global AI Developer Hackathon, Startup track (TODO for AI Kft.). Building period Oct 27 – Nov 4 2026, submit by Nov 4 21:00 ET.

## Problem statement fit

"Build for Your World": people already have a phone and a laptop full of logged-in apps. Today's computer-use agents run in a hosted sandbox browser with no sessions, no apps, no camera, no calls. Handsfree drives the devices you already own — the real Android phone over ADB and the real desktop — so a spoken request like *"text Anna I'm 10 minutes late, then start navigation home"* actually happens on your phone.

Who benefits: anyone whose hands or eyes are busy (driving, cooking, workshop, accessibility), and every small business doing phone-first workflows (Instagram DMs, WhatsApp orders, banking apps that have no web version).

## What is new vs. what exists (disclosure for judges)

Existing (TODO for AI, before the hackathon): a hosted todo/agent product, an open-source edge runtime (`todoforai/edge`) that exposes shell/files/browser tools, and an Android ADB relay that lets a bridge shell reach the phone.

**Built during the hackathon (this repo, all new code):**
1. `src/meta/` — Meta Model API client: Responses API with the native `computer` tool, SAM 3.1 segmentation, Muse Voice Transcribe realtime WebSocket.
2. `src/drivers/android.ts` — ADB computer-use driver: screenshot ↔ tap/swipe/type/key on a physical Android device.
3. `src/drivers/desktop.ts` — Linux desktop driver (xdotool/ydotool + screenshot).
4. `src/cua/loop.ts` — the observe-act loop with Muse Wonder/Spark as planner, safety-check gating, step cap, trajectory log.
5. `src/grounding/sam.ts` — **SAM-grounded clicks**: the planner names the target ("blue Send button", "the second contact row") and SAM 3.1 returns the box; we tap the box centre. Removes coordinate hallucination, the #1 failure of screenshot-only CUA on small phone UI.
6. `src/voice/` — push-to-talk mic → Muse Voice Transcribe (24 kHz PCM, `PUSH_TO_TALK` mode) → final transcript → task.
7. `cli.ts` — `handsfree "task"` and `handsfree --voice`, device selection, dry-run.
8. Demo video, eval set (20 phone tasks) with success rate before/after SAM grounding.

Nothing from the private frontend/backend is used. The edge runtime is not a dependency; the repo runs standalone with Bun + adb.

## Why it uses Meta tooling creatively (25% of score)

- **Three Meta models in one loop**, each for what it is best at: Voice Transcribe (input), Spark/Wonder (planning, `computer` tool), SAM 3.1 (grounding).
- SAM 3.1 as a *click oracle* is not a documented pattern; the docs position it for media. Using concept prompts ("red hang-up button") over UI screenshots turns a segmentation model into a robust UI element locator.
- Verifier step: after each action the planner is asked, with the new screenshot, whether the intended effect happened (Agents 102 "verifiable agents" theme).
- Optional **Best Open-Weight prize path**: swap planner to `meta-models/muse-spark-open-1026` on Baseten (same OpenAI-compatible API, no code change beyond base URL/model).

## Demo script (3 min)

1. 0:00 Hook: phone on the table, say "Open Instagram, reply to the last DM that we ship Monday." Phone does it. Split screen: live transcript, planner reasoning, SAM mask overlay on the screenshot.
2. 0:40 Why SAM: side-by-side, raw coordinate tap misses the tiny icon; SAM-grounded tap hits it. Show eval numbers.
3. 1:20 Cross-device: "Take the photo of the whiteboard and put it in my notes on the laptop." Phone camera → pull file → desktop driver opens the notes app.
4. 2:10 Safety: a `pending_safety_checks` from the API pauses the agent and asks for confirmation on screen.
5. 2:40 Open source, runs on your hardware, Muse Spark Open variant. Call to action.

## Prizes targeted

Startup track; Best Agentic Use-Case ($5K); Best Build on Meta Open Weight Models ($10K, via Baseten Muse Spark Open); Most Viral on X ($20K — post the phone demo clip).

## Risks

- `computer` tool may only be enabled for `muse-wonder-1.0` → fallback: function-tool action schema with Spark 1.3 (same driver).
- SAM over UI screenshots untested → day-1 experiment; fallback is Spark image-understanding with box output.
- Android typing of non-ASCII (Hungarian) via `adb shell input text` is lossy → use ADBKeyboard IME or clipboard paste.
- Credits: $150 Meta per person, claim by Nov 4. Baseten/Modal forms submitted day 1.

## Timeline

| Day | Goal |
|---|---|
| Oct 27 | Credits, API key, `models.list`, SAM-on-screenshot experiment, Android driver tap/type/screenshot |
| Oct 28 | CUA loop end-to-end on phone, 5 tasks passing |
| Oct 29 | SAM grounding integrated, eval harness, before/after numbers |
| Oct 30 | Voice input (realtime WS), push-to-talk CLI |
| Oct 31 – Nov 1 | Desktop driver, cross-device task, safety-check UI |
| Nov 2 | Baseten Muse Spark Open variant, README, polish |
| Nov 3 | Demo video, X post |
| Nov 4 | Buffer, submit before 21:00 ET (03:00 Nov 5 Budapest) |

## Open items (owner: Marcell)
- Claim $150 Meta Model API credits (form in participant guide; needs Meta account + card, per person, by Nov 4). Create key at dev.meta.ai dashboard → `MODEL_API_KEY`.
- Baseten $100 and Modal $100 credit forms.
- Day-1 experiments: does `tools:[{type:"computer"}]` work on muse-spark-1.3 or only muse-wonder-1.0; does SAM 3.1 return sensible boxes on UI screenshots.
