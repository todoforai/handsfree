// Action vocabulary of the Meta `computer` tool and the driver contract.
// https://dev.meta.ai/docs/computer-use

export type Action =
  | { type: "click"; button: "left" | "right" | "wheel" | "back" | "forward"; x: number; y: number }
  | { type: "double_click"; x: number; y: number }
  | { type: "drag"; path: { x: number; y: number }[] }
  | { type: "keypress"; keys: string[] }
  | { type: "move"; x: number; y: number }
  | { type: "scroll"; x: number; y: number; scroll_x: number; scroll_y: number }
  | { type: "type"; text: string }
  | { type: "screenshot" }
  | { type: "wait" };

export type SafetyCheck = { id: string; code: string; message: string };

export type ComputerCall = {
  type: "computer_call";
  id: string;
  call_id: string;
  actions: Action[];
  pending_safety_checks: SafetyCheck[];
  status: string;
};

export interface Screenshot {
  png: Uint8Array;
  width: number;
  height: number;
}

export interface Driver {
  readonly name: string;
  screenshot(): Promise<Screenshot>;
  /** Execute one action in screenshot pixel space. Throw to abort the batch. */
  execute(action: Action): Promise<void>;
  close?(): Promise<void>;
}
