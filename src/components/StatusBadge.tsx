import type { ReactNode } from "react";

export type Tone = "neutral" | "ok" | "warn" | "stop";

const TONES: Record<Tone, string> = {
  neutral: "border-[color:var(--rule)] text-ink-muted",
  ok: "border-[color:var(--signal-ok)] text-[color:var(--signal-ok)]",
  warn: "border-[color:var(--signal-warn)] text-[color:var(--signal-warn)]",
  stop: "border-[color:var(--signal-stop)] text-[color:var(--signal-stop)]",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-[color:var(--ink-muted)]",
  ok: "bg-[color:var(--signal-ok)]",
  warn: "bg-[color:var(--signal-warn)]",
  stop: "bg-[color:var(--signal-stop)]",
};

export default function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.12em] ${TONES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 ${DOTS[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
