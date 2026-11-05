interface ConfusionMatrixProps {
  matrix: number[][];
  labels: string[];
}

export default function ConfusionMatrix({ matrix, labels }: ConfusionMatrixProps) {
  const size = labels.length;
  const max = Math.max(1, ...matrix.flat());
  const total = matrix.reduce(
    (sum, row) => sum + row.reduce((rowSum, value) => rowSum + value, 0),
    0,
  );

  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${size + 1.6} ${size + 1.6}`}
          className="h-auto w-full min-w-[420px] max-w-[560px]"
          role="img"
          aria-label="Confusion matrix 26 kelas pada test set"
        >
          {matrix.map((row, rowIndex) =>
            row.map((value, columnIndex) => {
              const intensity = value === 0 ? 0 : 0.12 + 0.88 * (value / max);
              return (
                <rect
                  key={`${rowIndex}-${columnIndex}`}
                  x={1.4 + columnIndex}
                  y={1.4 + rowIndex}
                  width={0.94}
                  height={0.94}
                  fill={
                    value === 0
                      ? "var(--paper-sunk)"
                      : rowIndex === columnIndex
                        ? `rgba(63, 107, 74, ${intensity})`
                        : `rgba(166, 61, 36, ${intensity})`
                  }
                />
              );
            }),
          )}
          {labels.map((label, index) => (
            <text
              key={`row-${label}`}
              x={1.3}
              y={1.4 + index + 0.62}
              textAnchor="end"
              fontSize={0.62}
              fill="var(--ink-muted)"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {label}
            </text>
          ))}
          {labels.map((label, index) => (
            <text
              key={`col-${label}`}
              x={1.4 + index + 0.47}
              y={1.25}
              textAnchor="middle"
              fontSize={0.62}
              fill="var(--ink-muted)"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className="text-sm text-ink-muted">
        Gambar 1 — Confusion matrix pada {total} sampel test. Diagonal hijau =
        benar; sel merah = kesalahan. Baris = label asli, kolom = prediksi.
      </figcaption>

      <details className="text-sm">
        <summary className="focus-ring cursor-pointer text-ink-muted underline decoration-1 underline-offset-4">
          Lihat sebagai tabel
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">
              Confusion matrix dalam bentuk tabel
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-[color:var(--rule)] p-1">
                  Asli
                </th>
                {labels.map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="border-b border-[color:var(--rule)] p-1 text-center"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rowIndex) => (
                <tr key={labels[rowIndex]}>
                  <th
                    scope="row"
                    className="border-b border-[color:var(--rule)] p-1"
                  >
                    {labels[rowIndex]}
                  </th>
                  {row.map((value, columnIndex) => (
                    <td
                      key={labels[columnIndex]}
                      className={`border-b border-[color:var(--rule)] p-1 text-center tabular ${
                        value > 0 ? "font-semibold" : "text-ink-muted"
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
