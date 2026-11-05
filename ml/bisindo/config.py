"""Single source of truth for the label order and feature contract.

The JavaScript implementation in ``src/features/landmarks/features.ts`` must
produce exactly the same vector. ``tests/fixtures/feature_vectors.json`` is
generated from this module and asserted by Vitest.
"""

CLASSES = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

#: Bumped whenever the feature layout changes. The web app refuses to load a
#: model whose ``feature_spec_version`` does not match its own implementation.
FEATURE_SPEC_VERSION = "1.0.0"

#: 63 coordinates + 15 flexion cosines + 5 wrist-tip distances
#: + 10 inter-tip distances + 3 palm-normal components.
N_FEATURES = 96

#: Letters that are produced by a movement trajectory rather than a pose.
MOTION_CLASSES = ["J", "Z"]

#: Minimum palm length in normalised image units. Below this the hand is too
#: small / too far away and the sample is rejected.
MIN_PALM_LENGTH = 1e-3

#: MediaPipe hand landmark indices.
WRIST = 0
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_MCP = 9
PINKY_MCP = 17
TIPS = [4, 8, 12, 16, 20]

#: (joint, previous, next) triples for the 15 flexion angles.
FINGER_JOINTS = [
    (1, 0, 2), (2, 1, 3), (3, 2, 4),          # thumb
    (5, 0, 6), (6, 5, 7), (7, 6, 8),          # index
    (9, 0, 10), (10, 9, 11), (11, 10, 12),    # middle
    (13, 0, 14), (14, 13, 15), (15, 14, 16),  # ring
    (17, 0, 18), (18, 17, 19), (19, 18, 20),  # pinky
]
