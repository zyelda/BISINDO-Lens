"""Reconstruct usable landmark rows from the public KrisnaSantosa15 split.

The upstream CSV is misaligned: it declares 42 columns per axis but writes a
flat ``[x, y, z]`` sequence per detected landmark. Reading the non-null values
in column order recovers the original flat sequence, which is 63 values for a
single hand and 126 for two hands.

Source: https://github.com/KrisnaSantosa15/realtime-bisindo-classification
License: MIT. Derived from the Kaggle "BISINDO Alphabets" dataset (CC0).

Usage:
    python -m ml.bisindo.ingest_krisna
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np
import pandas as pd

from .config import CLASSES
from .features import palm_span

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "krisna-bisindo" / "data"
OUT = ROOT / "data" / "processed" / "krisna_landmarks.csv"


def _pick_primary(hands: list[np.ndarray]) -> int:
    """The signing hand is normally the closest/largest one."""
    return int(np.argmax([palm_span(h) for h in hands]))


def reconstruct(path: Path, split: str) -> list[dict]:
    df = pd.read_csv(path)
    rows: list[dict] = []
    for _, row in df.iterrows():
        label = str(row["label"]).strip().upper()
        if label not in CLASSES:
            continue
        values = row.drop(labels=["label"]).dropna().to_numpy(dtype=np.float64)
        if values.size not in (63, 126):
            continue
        hands = list(values.reshape(-1, 21, 3))
        primary = _pick_primary(hands)
        hand = hands[primary]
        record = {
            "label": label,
            "source": "krisna-csv",
            "split": split,
            "n_hands": len(hands),
            "hand_index": primary,
        }
        for i in range(21):
            record[f"l{i}_x"], record[f"l{i}_y"], record[f"l{i}_z"] = (
                float(hand[i, 0]),
                float(hand[i, 1]),
                float(hand[i, 2]),
            )
        rows.append(record)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=OUT)
    args = parser.parse_args()

    rows: list[dict] = []
    for split in ("train", "val", "test"):
        source = RAW / f"{split}.csv"
        if not source.exists():
            raise SystemExit(f"missing {source}; clone the repository first")
        part = reconstruct(source, split)
        print(f"{split}: {len(part)} usable rows")
        rows.extend(part)

    if not rows:
        raise SystemExit("no usable rows reconstructed")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows -> {args.out}")


if __name__ == "__main__":
    main()
