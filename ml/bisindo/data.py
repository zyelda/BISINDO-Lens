"""Dataset loading, landmark augmentation and evaluation helpers."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .config import CLASSES, N_FEATURES
from .features import extract_hand_features

ROOT = Path(__file__).resolve().parents[2]
KRISNA = ROOT / "data" / "processed" / "krisna_landmarks.csv"
IMAGES = ROOT / "data" / "processed" / "images_landmarks.csv"


def _landmarks(row: pd.Series) -> np.ndarray:
    return np.array(
        [[row[f"l{i}_x"], row[f"l{i}_y"], row[f"l{i}_z"]] for i in range(21)],
        dtype=np.float64,
    )


def load_frame(path: Path, source: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["source"] = source
    return df


def frame_to_features(
    df: pd.DataFrame,
    *,
    use_image_aspect: bool,
    force_aspect: float | None = None,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    features, labels, sources = [], [], []
    for _, row in df.iterrows():
        if force_aspect is not None:
            aspect = force_aspect
        elif use_image_aspect and "image_width" in row and pd.notna(row.get("image_width")):
            aspect = float(row["image_width"]) / float(row["image_height"])
        else:
            aspect = 1.0
        vector = extract_hand_features(_landmarks(row), aspect)
        if not np.isfinite(vector).all():
            continue
        features.append(vector)
        labels.append(row["label"])
        sources.append(row.get("source", "unknown"))
    return np.vstack(features), np.array(labels), sources


def augment(lm: np.ndarray, rng: np.random.Generator, aspect: float = 1.0) -> np.ndarray:
    """Small, label-preserving landmark augmentation.

    Rotation is kept conservative (±9°) so orientation-dependent letters
    (G/Q, P/K) remain distinguishable.
    """
    pts = lm.astype(np.float64).copy()
    pts[:, 0] *= aspect
    pts[:, 2] *= aspect
    wrist = pts[0].copy()

    theta = rng.uniform(-0.16, 0.16)
    cos_t, sin_t = np.cos(theta), np.sin(theta)
    rot = np.array([[cos_t, -sin_t], [sin_t, cos_t]])
    pts[:, :2] = (pts[:, :2] - wrist[:2]) @ rot.T + wrist[:2]

    pts *= rng.uniform(0.9, 1.1)
    pts += rng.normal(0.0, 0.008, pts.shape)
    if rng.random() < 0.5:
        pts[:, 0] *= -1.0

    pts[:, 0] /= aspect
    pts[:, 2] /= aspect
    return pts


def augment_dataset(
    df: pd.DataFrame,
    copies: int,
    seed: int = 42,
    use_image_aspect: bool = True,
) -> pd.DataFrame:
    """Return the original rows plus `copies` augmented variants of each."""
    rng = np.random.default_rng(seed)
    records: list[dict] = []
    for _, row in df.iterrows():
        base = row.to_dict()
        records.append(base)
        aspect = (
            float(row["image_width"]) / float(row["image_height"])
            if use_image_aspect and pd.notna(row.get("image_width"))
            else 1.0
        )
        for _ in range(copies):
            pts = augment(_landmarks(row), rng, aspect)
            record = base.copy()
            for i in range(21):
                record[f"l{i}_x"], record[f"l{i}_y"], record[f"l{i}_z"] = pts[i]
            records.append(record)
    return pd.DataFrame.from_records(records)


def mirror_landmarks(df: pd.DataFrame) -> pd.DataFrame:
    """Return the same rows as they would appear in a horizontally mirrored
    frame. Used as a deployment stress test: a mirrored webcam preview must
    not change the predicted letter."""
    out = df.copy()
    for i in range(21):
        out[f"l{i}_x"] = 1.0 - out[f"l{i}_x"]
    return out


def confusion(y_true, y_pred, labels: list[str] = None) -> np.ndarray:
    labels = labels or CLASSES
    index = {c: i for i, c in enumerate(labels)}
    matrix = np.zeros((len(labels), len(labels)), dtype=int)
    for t, p in zip(y_true, y_pred):
        if t in index and p in index:
            matrix[index[t], index[p]] += 1
    return matrix


def per_class_report(y_true, y_pred, labels: list[str] = None) -> dict:
    labels = labels or CLASSES
    from sklearn.metrics import precision_recall_fscore_support

    p, r, f, s = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    return {
        label: {
            "precision": float(p[i]),
            "recall": float(r[i]),
            "f1": float(f[i]),
            "support": int(s[i]),
        }
        for i, label in enumerate(labels)
    }
