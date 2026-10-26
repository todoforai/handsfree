// Android driver over ADB. Works on a physical phone (USB or wireless debugging).
// Screenshots are downscaled to SCALE so coordinates stay stable and payloads small;
// actions are mapped back to device pixels.
import type { Action, Driver, Screenshot } from "./types";

const SCALE = 0.5;

export class AndroidDriver implements Driver {
  readonly name = "android";
  private devW = 0;
  private devH = 0;

  constructor(private serial = process.env.ANDROID_SERIAL ?? "") {}

  private adb(...args: string[]) {
    const base = this.serial ? ["adb", "-s", this.serial] : ["adb"];
    return Bun.spawn([...base, ...args], { stdout: "pipe", stderr: "pipe" });
  }

  private async run(...args: string[]): Promise<string> {
    const p = this.adb(...args);
    const out = await new Response(p.stdout).text();
    if ((await p.exited) !== 0) throw new Error(`adb ${args.join(" ")}: ${await new Response(p.stderr).text()}`);
    return out;
  }

  async init() {
    const m = /(\d+)x(\d+)/.exec(await this.run("shell", "wm", "size"));
    if (!m) throw new Error("cannot read screen size");
    [this.devW, this.devH] = [Number(m[1]), Number(m[2])];
  }

  async screenshot(): Promise<Screenshot> {
    if (!this.devW) await this.init();
    const p = this.adb("exec-out", "screencap", "-p");
    const raw = new Uint8Array(await new Response(p.stdout).arrayBuffer());
    await p.exited;
    const w = Math.round(this.devW * SCALE), h = Math.round(this.devH * SCALE);
    const ff = Bun.spawn(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-vf", `scale=${w}:${h}`, "-f", "image2", "-c:v", "png", "pipe:1"], { stdin: "pipe", stdout: "pipe" });
    ff.stdin.write(raw); ff.stdin.end();
    const png = new Uint8Array(await new Response(ff.stdout).arrayBuffer());
    await ff.exited;
    return { png, width: w, height: h };
  }

  private dx(x: number) { return Math.round(x / SCALE); }
  private dy(y: number) { return Math.round(y / SCALE); }

  async execute(a: Action) {
    switch (a.type) {
      case "click":
        if (a.button === "back") return void (await this.run("shell", "input", "keyevent", "KEYCODE_BACK"));
        return void (await this.run("shell", "input", "tap", `${this.dx(a.x)}`, `${this.dy(a.y)}`));
      case "double_click":
        await this.run("shell", "input", "tap", `${this.dx(a.x)}`, `${this.dy(a.y)}`);
        return void (await this.run("shell", "input", "tap", `${this.dx(a.x)}`, `${this.dy(a.y)}`));
      case "drag": {
        const [s, e] = [a.path[0], a.path[a.path.length - 1]];
        return void (await this.run("shell", "input", "swipe", `${this.dx(s.x)}`, `${this.dy(s.y)}`, `${this.dx(e.x)}`, `${this.dy(e.y)}`, "400"));
      }
      case "scroll": {
        const x = this.dx(a.x), y = this.dy(a.y);
        return void (await this.run("shell", "input", "swipe", `${x}`, `${y}`, `${x - this.dx(a.scroll_x)}`, `${y - this.dy(a.scroll_y)}`, "300"));
      }
      case "type":
        // TODO: non-ASCII needs ADBKeyboard IME or clipboard; `input text` only handles ASCII.
        return void (await this.run("shell", "input", "text", a.text.replace(/ /g, "%s").replace(/([()<>|;&*~"'\\])/g, "\\$1")));
      case "keypress":
        for (const k of a.keys) await this.run("shell", "input", "keyevent", KEYMAP[k] ?? k);
        return;
      case "move":
      case "screenshot":
        return;
      case "wait":
        return void (await Bun.sleep(1000));
    }
  }
}

const KEYMAP: Record<string, string> = {
  Enter: "KEYCODE_ENTER", Backspace: "KEYCODE_DEL", Tab: "KEYCODE_TAB", Escape: "KEYCODE_BACK",
  Home: "KEYCODE_HOME", ArrowUp: "KEYCODE_DPAD_UP", ArrowDown: "KEYCODE_DPAD_DOWN",
  ArrowLeft: "KEYCODE_DPAD_LEFT", ArrowRight: "KEYCODE_DPAD_RIGHT", Space: "KEYCODE_SPACE",
};
