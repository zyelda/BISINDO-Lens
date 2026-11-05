import { describe, expect, it } from "vitest";
import { classifyMotion, MOTION_WINDOW_MS, type TrailPoint } from "@/features/prediction/motion";

function polyline(
  waypoints: [number, number][],
  stepsPerSegment = 24,
  dt = 10,
): TrailPoint[] {
  const points: TrailPoint[] = [];
  let time = 0;
  for (let segment = 0; segment < waypoints.length - 1; segment += 1) {
    const [x0, y0] = waypoints[segment];
    const [x1, y1] = waypoints[segment + 1];
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const ratio = step / stepsPerSegment;
      points.push({
        x: x0 + (x1 - x0) * ratio,
        y: y0 + (y1 - y0) * ratio,
        t: time,
        palm: 1,
      });
      time += dt;
    }
  }
  const [lastX, lastY] = waypoints[waypoints.length - 1];
  points.push({ x: lastX, y: lastY, t: time, palm: 1 });
  return points;
}

describe("motion gate for J and Z", () => {
  it("recognises a horizontal Z trajectory", () => {
    const trail = polyline([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 0],
      [3, 0],
    ]);
    expect(trail[trail.length - 1].t).toBeLessThanOrEqual(MOTION_WINDOW_MS);
    const result = classifyMotion(trail);
    expect(result).not.toBeNull();
    expect(result?.letter).toBe("Z");
  });

  it("recognises a vertical J trajectory with a hook", () => {
    const trail = polyline([
      [0, 0],
      [0, 1],
      [-0.4, 1],
      [-0.4, 0.7],
    ]);
    const result = classifyMotion(trail);
    expect(result).not.toBeNull();
    expect(result?.letter).toBe("J");
  });

  it("returns null when there are too few points", () => {
    const trail = polyline(
      [
        [0, 0],
        [0.5, 0],
      ],
      3,
    );
    expect(classifyMotion(trail)).toBeNull();
    expect(classifyMotion([])).toBeNull();
  });

  it("returns null for a stationary hand", () => {
    const trail = Array.from({ length: 40 }, (_, index) => ({
      x: 0.5,
      y: 0.5,
      t: index * 20,
      palm: 1,
    }));
    expect(classifyMotion(trail)).toBeNull();
  });

  it("returns null when only one point is recent", () => {
    const trail = polyline([
      [0, 0],
      [0, 1],
      [-0.4, 1],
      [-0.4, 0.7],
    ]);
    const last = trail[trail.length - 1];
    trail.push({ ...last, t: last.t + 5000 });
    expect(classifyMotion(trail)).toBeNull();
  });

  it("ignores points without a usable palm length", () => {
    const trail = polyline([
      [0, 0],
      [0, 1],
      [-0.4, 1],
      [-0.4, 0.7],
    ]).map((point) => ({ ...point, palm: 0 }));
    expect(classifyMotion(trail)).toBeNull();
  });
});
