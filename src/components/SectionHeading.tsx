import type { ReactNode } from "react";

interface SectionHeadingProps {
  index: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}

export default function SectionHeading({
  index,
  title,
  lede,
  aside,
}: SectionHeadingProps) {
  return (
    <div className="rule flex flex-col gap-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">
          {index} / {title}
        </p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{title}</h1>
        {lede ? <p className="mt-3 text-ink-muted">{lede}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
