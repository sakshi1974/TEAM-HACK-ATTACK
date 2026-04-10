# File: app/services/anomaly_service.py

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple


def detect_anomalies(metrics: List[float]) -> Tuple[bool, List[float], int]:
    """
    Run Isolation Forest anomaly detection on a list of metric values.

    Args:
        metrics: A flat list of numeric values to evaluate.

    Returns:
        Tuple of:
          - has_anomaly (bool): True if at least one point is an anomaly.
          - scores (List[float]): Raw anomaly scores (lower = more anomalous).
          - anomaly_count (int): Number of anomalous data points detected.

    Notes:
        Isolation Forest labels:
          -1 → anomaly
           1 → normal
    """
    if not metrics:
        raise ValueError("metrics list must not be empty")

    # Reshape to 2-D array required by sklearn (n_samples, n_features)
    X = np.array(metrics, dtype=float).reshape(-1, 1)

    # Tune contamination heuristically: assume up to 10 % anomalies
    contamination = min(0.10, max(0.01, 1.0 / len(metrics)))

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
    )
    model.fit(X)

    predictions = model.predict(X)          # 1 = normal, -1 = anomaly
    scores = model.score_samples(X).tolist()  # raw anomaly scores

    anomaly_count = int(np.sum(predictions == -1))
    has_anomaly = anomaly_count > 0

    return has_anomaly, scores, anomaly_count
