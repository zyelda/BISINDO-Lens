"""Compare candidate training sets before committing to a final model.

Run:
    python -m ml.bisindo.experiment
"""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

from .data import IMAGES, KRISNA, augment_dataset, frame_to_features, load_frame
from .features import FEATURE_SPEC_VERSION


def evaluate(name, X_tr, y_tr, X_te, y_te):
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=14,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42,
    )
    clf.fit(X_tr, y_tr)
    pred = clf.predict(X_te)
    acc = accuracy_score(y_te, pred)
    macro = f1_score(y_te, pred, average="macro", zero_division=0)
    print(f"{name:52s} acc={acc:.4f} macroF1={macro:.4f} n_train={len(y_tr)}")
    return acc, macro


def main():
    print("feature spec", FEATURE_SPEC_VERSION)
    krisna = load_frame(KRISNA, "krisna")
    images = load_frame(IMAGES, "zappie")

    # Clean Krisna subset: rows where MediaPipe saw a single hand.
    k1 = krisna[krisna["n_hands"] == 1].copy()
    print("krisna rows", len(krisna), "single-hand", len(k1))

    img_train = images[images["split"] == "train"]
    img_test = images[images["split"] == "test"]

    # --- reference: Zappie train -> Zappie test (same source, honest split)
    Xtr, ytr, _ = frame_to_features(img_train, use_image_aspect=True)
    Xte, yte, _ = frame_to_features(img_test, use_image_aspect=True)
    evaluate("Zappie train -> Zappie test", Xtr, ytr, Xte, yte)

    Xtr2, ytr2, _ = frame_to_features(img_train, use_image_aspect=True)
    Xte2, yte2, _ = frame_to_features(img_test, use_image_aspect=False)
    evaluate("Zappie train (aspect) -> test (no aspect)", Xtr2, ytr2, Xte2, yte2)

    # --- cross source: Krisna -> Zappie, both aspect assumptions
    for aspect in (1.0, 640 / 480):
        Xa, ya, _ = frame_to_features(
            k1[k1["split"] == "train"], use_image_aspect=False, force_aspect=aspect
        )
        Xb, yb, _ = frame_to_features(img_test, use_image_aspect=True)
        evaluate(f"Krisna(aspect={aspect:.3f}) -> Zappie test", Xa, ya, Xb, yb)

    # --- combined
    Xa, ya, _ = frame_to_features(
        k1[k1["split"] == "train"], use_image_aspect=False, force_aspect=1.0
    )
    Xb, yb, _ = frame_to_features(img_train, use_image_aspect=True)
    Xt, yt, _ = frame_to_features(img_test, use_image_aspect=True)
    evaluate(
        "Krisna + Zappie train -> Zappie test",
        np.vstack([Xa, Xb]),
        np.concatenate([ya, yb]),
        Xt,
        yt,
    )

    # --- augmented Zappie only
    aug = augment_dataset(img_train, copies=8, seed=7, use_image_aspect=True)
    Xaug, yaug, _ = frame_to_features(aug, use_image_aspect=True)
    evaluate("Zappie train x9 (augmented) -> Zappie test", Xaug, yaug, Xt, yt)

    # --- augmented combined
    augk = augment_dataset(k1[k1["split"] == "train"], copies=1, seed=7, use_image_aspect=False)
    Xak, yak, _ = frame_to_features(augk, use_image_aspect=False, force_aspect=1.0)
    evaluate(
        "Krisna x2 + Zappie x9 -> Zappie test",
        np.vstack([Xak, Xaug]),
        np.concatenate([yak, yaug]),
        Xt,
        yt,
    )


if __name__ == "__main__":
    main()
