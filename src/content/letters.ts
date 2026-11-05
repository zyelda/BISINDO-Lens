export type LetterKind = "static" | "motion";

export interface LetterEntry {
  letter: string;
  kind: LetterKind;
  /** Shown under the sample image. Kept factual, no invented handshape claims. */
  note: string;
  sample: string;
}

const STATIC_NOTE =
  "Pose tangan tunggal. Contoh adalah foto asli dari dataset publik; arah dan variasi chart BISINDO dapat berbeda.";

const MOTION_NOTE =
  "Memerlukan gerakan. Model statis tidak dapat memutuskan huruf ini sendiri; aplikasi memakai gerbang lintasan ujung telunjuk.";

export const LETTERS: LetterEntry[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  .split("")
  .map((letter) => {
    const motion = letter === "J" || letter === "Z";
    return {
      letter,
      kind: motion ? "motion" : "static",
      note: motion ? MOTION_NOTE : STATIC_NOTE,
      sample: `/letters/${letter}.jpg`,
    };
  });

export const MOTION_LETTERS = LETTERS.filter((entry) => entry.kind === "motion");
export const STATIC_LETTERS = LETTERS.filter((entry) => entry.kind === "static");

export const HISTORY_LIMIT = 40;
