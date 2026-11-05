import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyDir(from, to, filter) {
  if (!existsSync(from)) {
    console.warn(`[copy-assets] skip (missing): ${from}`);
    return;
  }
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      if (filter?.(entry.name)) copyDir(source, target, filter);
    } else if (!filter || filter(entry.name)) {
      cpSync(source, target);
    }
  }
}

// MediaPipe Tasks Vision WASM runtime (self hosted, no CDN dependency).
copyDir(
  join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm"),
  join(root, "public", "mediapipe", "wasm"),
);

// ONNX Runtime Web is imported from source instead: the classifier asks Vite
// for the exact .wasm and .mjs files, so they are fingerprinted and must not
// be copied through /public.

console.log("[copy-assets] MediaPipe runtime assets copied to public/");
