# Handsfree

> Talk to your real phone. Muse Voice Transcribe hears you, Muse Spark/Wonder plans, SAM 3.1 finds the pixel, ADB taps it.

Built for the **Meta Global AI Developer Hackathon** (Oct 27 – Nov 4, 2026) by [TODO for AI](https://todofor.ai). Everything in this repository was written during the hackathon — see [CONCEPT.md](CONCEPT.md) for the full disclosure of prior work vs. new work.

## What it does

```
handsfree "Open WhatsApp and tell Anna I'm 10 minutes late"
handsfree --voice          # push-to-talk
handsfree --locate "blue send button"   # SAM 3.1 grounding on the current screen
```

A computer-use agent that drives **your own Android phone** (and later your desktop) instead of a cloud sandbox — real apps, real sessions, camera, calls, SMS.

## Meta models used

| Model | Role |
|---|---|
| `muse-wonder-1.0` / `muse-spark-1.3` | Planner, native `computer` tool (observe-act loop) |
| `sam-3.1` | UI grounding: "red hang-up button" → box → tap centre |
| `muse-voice-transcribe-1.0` | Push-to-talk input over the realtime WebSocket |
| `muse-spark-open-1026` (Baseten) | Optional open-weight planner (`HANDSFREE_PLANNER=baseten:meta-models/muse-spark-open-1026`) |

## Run

Requirements: [Bun](https://bun.sh), `adb` with a connected phone (`adb devices`), `ffmpeg`, PulseAudio/PipeWire for `--voice`.

```sh
cp .env.example .env   # set MODEL_API_KEY
bun install
bun run cli.ts "Open Settings and turn on Bluetooth"
```

Every run writes raw API responses to `runs/<timestamp>/` for debugging and for the demo overlays.

## Layout

```
cli.ts                 entry point
src/meta/client.ts     Meta Model API fetch wrapper, planner selection
src/drivers/           Driver interface + Android (ADB) driver
src/cua/loop.ts        observe-act loop, safety checks, SAM `locate` tool
src/grounding/sam.ts   SAM 3.1 concept → boxes parser
src/voice/listen.ts    mic → Muse Voice Transcribe realtime
```

## Status

Scaffold, day 0. Progress log in [CONCEPT.md](CONCEPT.md#timeline).

## License

MIT
