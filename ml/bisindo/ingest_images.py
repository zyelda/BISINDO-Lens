"""Extract 21 hand landmarks from labelled images with the same MediaPipe
Tasks model that the web app uses.

Expected file names: ``A.<anything>.jpg`` where ``A`` is the label.

Usage:
    python -m ml.bisindo.ingest_images --input data/raw/zappie-bisindo/train --split train
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

from .config import CLASSES
from .features import palm_span

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "public" / "mediapipe" / "hand_landmarker.task"
OUT = ROOT / "data" / "processed" / "images_landmarks.csv"


def build_landmarker() -> vision.HandLandmarker:
    base = mpp.BaseOptions(model_asset_path=str(MODEL))
    options = vision.HandLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.3,
        min_hand_presence_confidence=0.3,
    )
    return vision.HandLandmarker.create_from_options(options)


def primary_index(hands, width: int, height: int) -> int:
    spans = []
    for hand in hands:
        pts = np.array([[p.x * width, p.y * height, p.z * width] for p in hand])
        spans.append(palm_span(pts))
    return int(np.argmax(spans))


def process_folder(folder: Path, split: str, out_path: Path) -> None:
    landmarker = build_landmarker()
    files = sorted(
        p
        for p in folder.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    rows: list[dict] = []
    skipped = 0
    try:
        for path in files:
            label = path.name.split(".")[0].strip().upper()
            if label not in CLASSES:
                skipped += 1
                continue
            image = cv2.imread(str(path))
            if image is None:
                skipped += 1
                continue
            height, width = image.shape[:2]
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = landmarker.detect(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            )
            if not result.hand_landmarks:
                skipped += 1
                continue
            idx = primary_index(result.hand_landmarks, width, height)
            hand = result.hand_landmarks[idx]
            handedness = result.handedness[idx][0]
            record = {
                "label": label,
                "source": folder.parent.name,
                "split": split,
                "n_hands": len(result.hand_landmarks),
                "hand_index": idx,
                "handedness": handedness.category_name,
                "handedness_score": round(float(handedness.score), 4),
                "image_width": width,
                "image_height": height,
                "file": path.name,
            }
            for i, point in enumerate(hand):
                record[f"l{i}_x"] = float(point.x)
                record[f"l{i}_y"] = float(point.y)
                record[f"l{i}_z"] = float(point.z)
            rows.append(record)
    finally:
        landmarker.close()

    if not rows:
        raise SystemExit("no images with a detected hand")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not out_path.exists()
    with out_path.open("a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        if write_header:
            writer.writeheader()
        writer.writerows(rows)

    print(
        f"{folder}: {len(rows)} detected, {skipped} skipped "
        f"({len(files)} files) -> {out_path}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--split", default="train")
    parser.add_argument("--out", type=Path, default=OUT)
    args = parser.parse_args()
    if args.out.exists() and args.split == "train":
        args.out.unlink()
    process_folder(args.input, args.split, args.out)


if __name__ == "__main__":
    main()
