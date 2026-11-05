"""Hand landmark feature extraction.

The layout is deliberately identical to ``src/features/landmarks/features.ts``.
Any change here must be mirrored there and the golden fixtures regenerated.
"""

from __future__ import annotations

import numpy as np

from .config import (
    FINGER_JOINTS,
    MIN_PALM_LENGTH,
    N_FEATURES,
    TIPS,
    FEATURE_SPEC_VERSION,
)

_EPS = 1e-9


def _cos_angle(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < _EPS or nb < _EPS:
        return 0.0
    value = float(np.dot(a, b) / (na * nb))
    return max(-1.0, min(1.0, value))


def extract_hand_features(landmarks, aspect: float = 1.0) -> np.ndarray:
    """Build the 96-dimensional feature vector for one hand.

    Parameters
    ----------
    landmarks:
        Sequence of 21 ``[x, y, z]`` MediaPipe normalised landmarks.
    aspect:
        Image width / height. Normalised MediaPipe coordinates are relative
        to each axis separately, so shapes are only comparable across
        different cameras after this correction.
    """
    pts = np.asarray(landmarks, dtype=np.float64)
    if pts.shape != (21, 3):
        raise ValueError(f"expected 21x3 landmarks, got {pts.shape}")

    pts = pts.copy()
    # Reconstruct an isotropic pixel-ish space (height is the reference unit).
    pts[:, 0] *= aspect
    pts[:, 2] *= aspect

    # Translate the wrist to the origin, then scale by palm length. Rotation
    # is intentionally NOT removed: letters such as G/Q differ by orientation.
    pts -= pts[0].copy()
    palm = float(np.linalg.norm(pts[9]))
    if palm < MIN_PALM_LENGTH:
        # Degenerate hand. Return a zero vector so callers can reject it via
        # the `valid` flag instead of crashing.
        return np.zeros(N_FEATURES, dtype=np.float64)
    pts /= palm

    coords = pts.reshape(-1)  # 63

    angles = np.array(
        [_cos_angle(pts[j] - pts[p], pts[n] - pts[j]) for j, p, n in FINGER_JOINTS],
        dtype=np.float64,
    )  # 15

    wrist = pts[0]
    tip_wrist = np.array(
        [float(np.linalg.norm(pts[t] - wrist)) for t in TIPS], dtype=np.float64
    )  # 5

    inter = []
    for i in range(len(TIPS)):
        for j in range(i + 1, len(TIPS)):
            inter.append(float(np.linalg.norm(pts[TIPS[i]] - pts[TIPS[j]])))
    inter = np.asarray(inter, dtype=np.float64)  # 10

    normal = np.cross(pts[5] - wrist, pts[17] - wrist)
    norm_len = float(np.linalg.norm(normal))
    normal = normal / norm_len if norm_len > _EPS else np.zeros(3)  # 3

    out = np.concatenate([coords, angles, tip_wrist, inter, normal])
    if out.shape[0] != N_FEATURES:
        raise RuntimeError(f"feature length {out.shape[0]} != {N_FEATURES}")
    out = np.nan_to_num(out, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(out, -20.0, 20.0)


def is_valid_hand(landmarks) -> bool:
    """A hand is usable when the palm has a non-degenerate span."""
    pts = np.asarray(landmarks, dtype=np.float64)
    if pts.shape != (21, 3):
        return False
    if not np.isfinite(pts).all():
        return False
    return float(np.linalg.norm(pts[9] - pts[0])) >= MIN_PALM_LENGTH


def palm_span(landmarks) -> float:
    pts = np.asarray(landmarks, dtype=np.float64)
    return float(np.linalg.norm(pts[9] - pts[0]))


FEATURE_NAMES = (
    [f"lm{i}_{axis}" for i in range(21) for axis in "xyz"]
    + [f"flex_{i}" for i in range(15)]
    + [f"tipwrist_{i}" for i in range(5)]
    + [f"intertip_{i}" for i in range(10)]
    + ["normal_x", "normal_y", "normal_z"]
)

assert len(FEATURE_NAMES) == N_FEATURES

__all__ = [
    "extract_hand_features",
    "is_valid_hand",
    "palm_span",
    "FEATURE_NAMES",
    "FEATURE_SPEC_VERSION",
]
