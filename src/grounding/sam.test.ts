import { expect, test } from "bun:test";
import { parseBoxes, centre } from "./sam";

test("parses SAM box tokens", () => {
  const t = "<0f>1<|box;x1=444;y1=625;x2=679;y2=850;w=1800;h=1200|><|mask;x=0;y=0;data=1|>,2<|box;x1=10;y1=20;x2=30;y2=40;w=1800;h=1200|>";
  const b = parseBoxes(t);
  expect(b).toEqual([{ x1: 444, y1: 625, x2: 679, y2: 850 }, { x1: 10, y1: 20, x2: 30, y2: 40 }]);
  expect(centre(b[1])).toEqual({ x: 20, y: 30 });
});
