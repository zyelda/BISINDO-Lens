export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export const N_FEATURES = 96;
export const FEATURE_SPEC_VERSION = "1.0.0";
export const MIN_PALM_LENGTH = 1e-3;

export const TIPS = [4, 8, 12, 16, 20] as const;

const FINGER_JOINTS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 2],
  [2, 1, 3],
  [3, 2, 4],
  [5, 0, 6],
  [6, 5, 7],
  [7, 6, 8],
  [9, 0, 10],
  [10, 9, 11],
  [11, 10, 12],
  [13, 0, 14],
  [14, 13, 15],
  [15, 14, 16],
  [17, 0, 18],
  [18, 17, 19],
  [19, 18, 20],
];

const EPS = 1e-9;

type Vec3 = [number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm(a: Vec3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b));
}

function cosAngle(a: Vec3, b: Vec3): number {
  const na = norm(a);
  const nb = norm(b);
  if (na < EPS || nb < EPS) return 0;
  const value = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb);
  return Math.max(-1, Math.min(1, value));
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function palmSpan(landmarks: Landmark[]): number {
  return distance(
    [landmarks[0].x, landmarks[0].y, landmarks[0].z],
    [landmarks[9].x, landmarks[9].y, landmarks[9].z],
  );
}

export function isValidHand(landmarks: Landmark[]): boolean {
  if (landmarks.length !== 21) return false;
  for (const p of landmarks) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      return false;
    }
  }
  return palmSpan(landmarks) >= MIN_PALM_LENGTH;
}

/**
 * Mirror of `ml/bisindo/features.py`. Keep the operation order identical.
 * `aspect` is video width / height.
 */
export function extractHandFeatures(
  landmarks: Landmark[],
  aspect = 1,
): Float32Array {
  if (landmarks.length !== 21) {
    throw new Error(`expected 21 landmarks, got ${landmarks.length}`);
  }

  const pts: Vec3[] = landmarks.map((p) => [p.x * aspect, p.y, p.z * aspect]);

  const wrist = pts[0];
  for (let i = 0; i < 21; i += 1) {
    pts[i] = sub(pts[i], wrist);
  }

  const palm = norm(pts[9]);
  const out = new Float32Array(N_FEATURES);
  if (palm < MIN_PALM_LENGTH) {
    return out;
  }
  for (let i = 0; i < 21; i += 1) {
    pts[i] = [pts[i][0] / palm, pts[i][1] / palm, pts[i][2] / palm];
  }

  let cursor = 0;
  for (let i = 0; i < 21; i += 1) {
    out[cursor++] = pts[i][0];
    out[cursor++] = pts[i][1];
    out[cursor++] = pts[i][2];
  }

  for (const [joint, previous, next] of FINGER_JOINTS) {
    out[cursor++] = cosAngle(sub(pts[joint], pts[previous]), sub(pts[next], pts[joint]));
  }

  for (const tip of TIPS) {
    out[cursor++] = distance(pts[tip], pts[0]);
  }

  for (let i = 0; i < TIPS.length; i += 1) {
    for (let j = i + 1; j < TIPS.length; j += 1) {
      out[cursor++] = distance(pts[TIPS[i]], pts[TIPS[j]]);
    }
  }

  const normalRaw = cross(pts[5], pts[17]);
  const normalLength = norm(normalRaw);
  if (normalLength > EPS) {
    out[cursor++] = normalRaw[0] / normalLength;
    out[cursor++] = normalRaw[1] / normalLength;
    out[cursor++] = normalRaw[2] / normalLength;
  } else {
    cursor += 3;
  }

  if (cursor !== N_FEATURES) {
    throw new Error(`feature length ${cursor} != ${N_FEATURES}`);
  }

  for (let i = 0; i < out.length; i += 1) {
    const value = out[i];
    out[i] = Number.isFinite(value) ? Math.max(-20, Math.min(20, value)) : 0;
  }
  return out;
}

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
