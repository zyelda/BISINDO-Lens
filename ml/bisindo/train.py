"""Train, tune, evaluate and export the BISINDO Lens Random Forest.

Run:
    python -m ml.bisindo.train

Artifacts land in ``public/models/`` and are consumed by the web app.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import onnxruntime as ort
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold

from .config import CLASSES, FEATURE_SPEC_VERSION, N_FEATURES
from .data import (
    IMAGES,
    augment_dataset,
    frame_to_features,
    load_frame,
    mirror_landmarks,
    per_class_report,
)
from .features import FEATURE_NAMES

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "models"
VERSION = "1.0.0"


def make_model(**kwargs) -> RandomForestClassifier:
    params = dict(
        n_estimators=400,
        max_depth=16,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42,
    )
    params.update(kwargs)
    return RandomForestClassifier(**params)


def cv_score(X, y, **params) -> tuple[float, float]:
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = []
    for tr, va in skf.split(X, y):
        clf = make_model(**params)
        clf.fit(X[tr], y[tr])
        scores.append(f1_score(y[va], clf.predict(X[va]), average="macro", zero_division=0))
    return float(np.mean(scores)), float(np.std(scores))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    images = load_frame(IMAGES, "zappie")
    train_df = images[images["split"] == "train"]
    test_df = images[images["split"] == "test"]

    X_train, y_train, _ = frame_to_features(train_df, use_image_aspect=True)
    X_test, y_test, _ = frame_to_features(test_df, use_image_aspect=True)

    print(f"train={len(y_train)} test={len(y_test)} classes={len(set(y_train))}")

    # ---- model selection on the training split only -----------------------
    grid = []
    for n_est in (300, 500):
        for depth in (12, 16, None):
            for leaf in (1, 2):
                grid.append(dict(n_estimators=n_est, max_depth=depth, min_samples_leaf=leaf))

    results = []
    for params in grid:
        mean, std = cv_score(X_train, y_train, **params)
        results.append({"params": params, "cv_macro_f1": mean, "cv_std": std})
        print(f"  {params} -> cv macroF1 {mean:.4f} ± {std:.4f}")

    best_score = max(r["cv_macro_f1"] for r in results)
    # Differences below 0.005 are inside the fold-to-fold noise; prefer the
    # smaller forest so the browser model stays small.
    candidates = [r for r in results if r["cv_macro_f1"] >= best_score - 0.005]
    best = min(
        candidates,
        key=lambda r: (
            r["params"]["n_estimators"],
            r["params"]["max_depth"] or 99,
        ),
    )
    print("best:", best)

    # ---- final fit on all training data ----------------------------------
    # Horizontal flipping is a deployment requirement: the webcam preview is
    # mirrored by default, so the classifier must not depend on the left/right
    # orientation of the hand. Rotation is kept small (±9°) because letters
    # such as G/Q differ by orientation.
    augmented = augment_dataset(train_df, copies=1, seed=7, use_image_aspect=True)
    X_fit, y_fit, _ = frame_to_features(augmented, use_image_aspect=True)
    print(f"augmented training rows={len(y_fit)}")

    model = make_model(**best["params"])
    model.fit(X_fit, y_fit)

    y_pred = model.predict(X_test)
    labels = CLASSES
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    mirrored_test = mirror_landmarks(test_df)
    X_mirrored, y_mirrored, _ = frame_to_features(mirrored_test, use_image_aspect=True)
    y_pred_mirrored = model.predict(X_mirrored)

    metrics = {
        "version": VERSION,
        "feature_spec_version": FEATURE_SPEC_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "name": "Research-Binus-BISINDO-DATASET",
            "url": "https://github.com/Zappie733/Research-Binus-BISINDO-DATASET",
            "license": "MIT",
            "signers": 1,
            "train_images": int(len(train_df)),
            "train_images_augmented": int(len(y_fit)),
            "test_images": int(len(test_df)),
            "note": "Eksternal, satu signer, foto 640x480; split mengikuti folder train/test repositori. Training memakai augmentasi flip horizontal, rotasi kecil, skala, dan noise.",
        },
        "classifier": model.get_params(),
        "cv": {"folds": 5, "best_macro_f1": best["cv_macro_f1"], "std": best["cv_std"]},
        "test": {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "balanced_accuracy": float(balanced_accuracy_score(y_test, y_pred)),
            "macro_precision": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
            "macro_recall": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
            "macro_f1": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
            "weighted_f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
            "samples": int(len(y_test)),
        },
        "per_class": per_class_report(y_test, y_pred, labels),
        "mirror_test": {
            "accuracy": float(accuracy_score(y_mirrored, y_pred_mirrored)),
            "macro_f1": float(f1_score(y_mirrored, y_pred_mirrored, average="macro", zero_division=0)),
            "samples": int(len(y_mirrored)),
            "note": "Test set yang sama dengan x dicerminkan horizontal; menguji ketahanan terhadap pratinjau webcam yang dicerminkan.",
        },
        "confusion_matrix": cm.tolist(),
        "labels": labels,
        "feature_names": FEATURE_NAMES,
        "limitations": [
            "Dievaluasi pada 104 foto dari satu signer; belum diuji lintas signer.",
            "J dan Z membutuhkan gerakan; classifier statis tidak dapat memvalidasinya.",
            "Confidence Random Forest adalah frekuensi voting, bukan probabilitas terkalibrasi.",
            "Chart BISINDO bervariasi antar daerah; model mengikuti referensi dataset.",
        ],
    }

    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (OUT / "label_map.json").write_text(
        json.dumps({str(i): c for i, c in enumerate(labels)}, indent=2), encoding="utf-8"
    )
    (OUT / "feature_spec.json").write_text(
        json.dumps(
            {
                "version": FEATURE_SPEC_VERSION,
                "n_features": N_FEATURES,
                "names": FEATURE_NAMES,
                "aspect": "width / height, applied to x and z before wrist translation",
                "scale": "palm length: ||landmark[9] - landmark[0]||",
                "clip": [-20, 20],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # ---- ONNX export ------------------------------------------------------
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    onnx_model = convert_sklearn(
        model,
        initial_types=[("input", FloatTensorType([None, N_FEATURES]))],
        options={"zipmap": False},
        target_opset=17,
    )
    model_path = OUT / "model.onnx"
    model_path.write_bytes(onnx_model.SerializeToString())

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    output_names = [o.name for o in session.get_outputs()]
    raw = session.run(None, {"input": X_test.astype(np.float32)})
    probability_index = next(
        i
        for i, output in enumerate(session.get_outputs())
        if len(output.shape) == 2 and output.shape[1] == len(labels)
    )
    probabilities = np.asarray(raw[probability_index], dtype=np.float64)
    ort_pred = np.array(labels)[np.argmax(probabilities, axis=1)]
    parity = float(np.mean(ort_pred == y_pred))
    metrics["onnx"] = {
        "size_bytes": model_path.stat().st_size,
        "parity_with_sklearn": parity,
        "input_name": "input",
        "output_names": output_names,
        "probability_output": output_names[probability_index],
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    # ---- golden fixtures for the TypeScript parity test -------------------
    fixture_rows = []
    sample = train_df.sample(n=6, random_state=11)
    for _, row in sample.iterrows():
        lm = np.array(
            [[row[f"l{i}_x"], row[f"l{i}_y"], row[f"l{i}_z"]] for i in range(21)],
            dtype=np.float64,
        )
        aspect = float(row["image_width"]) / float(row["image_height"])
        from .features import extract_hand_features

        fixture_rows.append(
            {
                "label": row["label"],
                "aspect": aspect,
                "landmarks": lm.tolist(),
                "features": extract_hand_features(lm, aspect).tolist(),
            }
        )
    fixtures = ROOT / "tests" / "fixtures"
    fixtures.mkdir(parents=True, exist_ok=True)
    (fixtures / "feature_vectors.json").write_text(
        json.dumps({"spec_version": FEATURE_SPEC_VERSION, "cases": fixture_rows}, indent=2),
        encoding="utf-8",
    )

    print("\n=== TEST (held out) ===")
    print(f"accuracy      {metrics['test']['accuracy']:.4f}")
    print(f"macro F1      {metrics['test']['macro_f1']:.4f}")
    print(f"balanced acc  {metrics['test']['balanced_accuracy']:.4f}")
    print(f"mirror acc    {metrics['mirror_test']['accuracy']:.4f}")
    print(f"mirror F1     {metrics['mirror_test']['macro_f1']:.4f}")
    print(f"onnx size     {model_path.stat().st_size / 1024 / 1024:.2f} MB")
    print(f"onnx parity   {parity:.4f}")
    print("\nper class:")
    for label in labels:
        m = metrics["per_class"][label]
        print(f"  {label}: P={m['precision']:.2f} R={m['recall']:.2f} F1={m['f1']:.2f} n={m['support']}")

    # worst pairs
    pairs = []
    for i, a in enumerate(labels):
        for j, b in enumerate(labels):
            if i != j and cm[i, j] > 0:
                pairs.append((int(cm[i, j]), a, b))
    pairs.sort(reverse=True)
    print("\ntop confusions:", pairs[:8])


if __name__ == "__main__":
    main()
