/**
 * Trajectory gate for the two motion letters, J and Z.
 *
 * A Random Forest sees a single frame and therefore cannot distinguish a
 * moving J from a static I-like handshape. This module inspects the recent
 * path of the index fingertip and only lets the static classifier emit J/Z
 * when the movement matches. It is a geometric heuristic, not a trained
 * model; the UI states that explicitly.
 */

export interface TrailPoint {
  x: number;
  y: number;
  /** performance.now() timestamp in milliseconds. */
  t: number;
  /** Palm length in the same normalised units, used for scale invariance. */
  palm: number;
}

export interface MotionResult {
  letter: "J" | "Z";
  score: number;
}

export const MOTION_WINDOW_MS = 1400;
const MIN_DURATION_MS = 450;
const MIN_POINTS = 10;
const RESAMPLE_COUNT = 32;

function resample(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return points.slice(0, RESAMPLE_COUNT);

  const result: { x: number; y: number }[] = [];
  let cursor = 1;
  for (let i = 0; i < RESAMPLE_COUNT; i += 1) {
    const target = (i / (RESAMPLE_COUNT - 1)) * total;
    while (cursor < cumulative.length - 1 && cumulative[cursor] < target) {
      cursor += 1;
    }
    const previous = cursor - 1;
    const span = cumulative[cursor] - cumulative[previous] || 1;
    const ratio = (target - cumulative[previous]) / span;
    result.push({
      x: points[previous].x + (points[cursor].x - points[previous].x) * ratio,
      y: points[previous].y + (points[cursor].y - points[previous].y) * ratio,
    });
  }
  return result;
}

export function classifyMotion(trail: TrailPoint[]): MotionResult | null {
  if (trail.length < MIN_POINTS) return null;

  const now = trail[trail.length - 1].t;
  const recent = trail.filter(
    (point) => now - point.t <= MOTION_WINDOW_MS && point.palm > 1e-3,
  );
  if (recent.length < MIN_POINTS) return null;
  if (now - recent[0].t < MIN_DURATION_MS) return null;

  const points = recent.map((point) => ({
    x: point.x / point.palm,
    y: point.y / point.palm,
  }));

  let pathLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    pathLength += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  if (pathLength < 0.9) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  const smooth = resample(points);
  const directions: { x: number; y: number }[] = [];
  for (let i = 1; i < smooth.length; i += 1) {
    const dx = smooth[i].x - smooth[i - 1].x;
    const dy = smooth[i].y - smooth[i - 1].y;
    const length = Math.hypot(dx, dy);
    if (length > 1e-4) directions.push({ x: dx / length, y: dy / length });
  }
  if (directions.length < 6) return null;

  let reversals = 0;
  let previousSign = 0;
  let maxTurn = 0;
  for (let i = 1; i < directions.length; i += 1) {
    const a = directions[i - 1];
    const b = directions[i];
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
    const turn = (Math.acos(dot) * 180) / Math.PI;
    maxTurn = Math.max(maxTurn, turn);
    const cross = a.x * b.y - a.y * b.x;
    if (Math.abs(cross) > 0.08) {
      const sign = Math.sign(cross);
      if (previousSign !== 0 && sign !== previousSign) reversals += 1;
      previousSign = sign;
    }
  }

  const start = points[0];
  const end = points[points.length - 1];
  const netX = end.x - start.x;
  const netY = end.y - start.y;
  const hookSpan = Math.hypot(
    smooth[smooth.length - 1].x - smooth[Math.floor(smooth.length * 0.7)].x,
    smooth[smooth.length - 1].y - smooth[Math.floor(smooth.length * 0.7)].y,
  );

  const zScore =
    (width / Math.max(height, 1e-3) >= 1.15 ? 0.35 : 0) +
    (pathLength >= 1.3 ? 0.2 : 0) +
    (reversals >= 2 ? 0.3 : 0) +
    (maxTurn >= 50 ? 0.15 : 0);

  const jScore =
    (height / Math.max(width, 1e-3) >= 0.85 ? 0.25 : 0) +
    (pathLength >= 1.1 ? 0.2 : 0) +
    (reversals <= 1 ? 0.2 : 0) +
    (netY >= 0.5 ? 0.2 : 0) +
    (Math.abs(netX) >= 0.25 && hookSpan >= 0.25 ? 0.15 : 0);

  if (zScore >= 0.75 && zScore > jScore) {
    return { letter: "Z", score: Math.min(1, zScore) };
  }
  if (jScore >= 0.75) {
    return { letter: "J", score: Math.min(1, jScore) };
  }
  return null;
}
