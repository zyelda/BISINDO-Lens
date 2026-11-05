interface ConfidenceBarProps {
  value: number;
  label?: string;
  tone?: "accent" | "ok" | "warn";
}

const FILL = {
  accent: "bg-accent",
  ok: "bg-[color:var(--signal-ok)]",
  warn: "bg-[color:var(--signal-warn)]",
};

export default function ConfidenceBar({
  value,
  label = "Keyakinan model",
  tone = "accent",
}: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{label}</span>
        <span className="tabular text-sm font-semibold">{percent}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full border border-[color:var(--rule)] bg-paper-sunk"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div
          className={`h-full transition-[width] duration-120 ${FILL[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
