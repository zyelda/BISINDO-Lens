import type { ReactNode } from "react";

interface ErrorPanelProps {
  title: string;
  detail: string;
  hint?: string;
  action?: ReactNode;
  tone?: "stop" | "warn";
}

export default function ErrorPanel({
  title,
  detail,
  hint,
  action,
  tone = "stop",
}: ErrorPanelProps) {
  const color =
    tone === "warn" ? "var(--signal-warn)" : "var(--signal-stop)";
  return (
    <div
      role="alert"
      className="border border-[color:var(--rule)] border-l-4 bg-paper p-5"
      style={{ borderLeftColor: color }}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{detail}</p>
      {hint ? (
        <p className="mt-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">Saran: </span>
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
