import { readFileSync, writeFileSync } from "node:fs";

/**
 * Chromium's fake capture device accepts a raw MJPEG stream: a plain
 * concatenation of JPEG frames. This produces it from the bundled letter
 * sample instead of committing a multi-megabyte binary fixture.
 */
export default function globalSetup(): void {
  const source = readFileSync(
    new URL("../public/letters/A.jpg", import.meta.url),
  );
  const frameCount = 120;
  const frames = Array.from({ length: frameCount }, () => source);
  writeFileSync(
    new URL("../tests/fixtures/hand-A.mjpeg", import.meta.url),
    Buffer.concat(frames),
  );
}
