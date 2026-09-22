import numpy as np
import pandas as pd
import random
from pathlib import Path

def generate_classification_dataset(output_csv: str = "ml/datasets/diagnosis_training_data.csv", n_samples: int = 2400, seed: int = 42):
    """
    Generates deterministic, labeled telemetry and contract features for training the AI Root-Cause Classifier.
    """
    np.random.seed(seed)
    random.seed(seed)
    Path(output_csv).parent.mkdir(parents=True, exist_ok=True)

    classes = [
        "schema_change",
        "data_quality",
        "dependency_failure",
        "resource_constraint",
        "timeout",
        "unknown"
    ]

    records = []
    samples_per_class = n_samples // len(classes)

    for target_class in classes:
        for _ in range(samples_per_class):
            # Base normal telemetry
            schema_changed = 0
            missing_cols_count = 0
            null_rate = max(0.0, np.random.normal(0.001, 0.002))
            duplicate_rate = max(0.0, np.random.normal(0.001, 0.002))
            contract_violation_count = 0
            upstream_failed = 0
            cpu_usage = float(np.clip(np.random.normal(35.0, 8.0), 5.0, 99.0))
            memory_mb = float(np.clip(np.random.normal(250.0, 40.0), 100.0, 4000.0))
            runtime_ratio = float(np.clip(np.random.normal(1.0, 0.1), 0.5, 5.0))
            error_rate = 0.0
            throughput_change = float(np.random.normal(0.0, 0.05))
            latency_change = float(np.random.normal(0.0, 0.05))

            if target_class == "schema_change":
                schema_changed = 1
                missing_cols_count = np.random.randint(1, 4)
                contract_violation_count = missing_cols_count + np.random.randint(0, 2)
                error_rate = 1.0

            elif target_class == "data_quality":
                contract_violation_count = np.random.randint(1, 15)
                null_rate = float(np.random.uniform(0.05, 0.40))
                duplicate_rate = float(np.random.uniform(0.02, 0.25))
                error_rate = float(np.random.uniform(0.5, 1.0))

            elif target_class == "dependency_failure":
                upstream_failed = 1
                error_rate = 1.0
                runtime_ratio = float(np.random.uniform(0.1, 0.3))  # aborted quickly

            elif target_class == "resource_constraint":
                cpu_usage = float(np.clip(np.random.normal(92.0, 4.0), 85.0, 99.9))
                memory_mb = float(np.clip(np.random.normal(3200.0, 300.0), 2000.0, 4096.0))
                latency_change = float(np.random.uniform(1.5, 4.0))
                error_rate = 1.0

            elif target_class == "timeout":
                runtime_ratio = float(np.clip(np.random.normal(3.2, 0.6), 2.1, 6.0))
                latency_change = float(np.random.uniform(2.0, 5.0))
                throughput_change = float(np.random.uniform(-0.8, -0.4))
                error_rate = 1.0

            elif target_class == "unknown":
                # subtle edge cases or transient fluctuations
                cpu_usage = float(np.clip(np.random.normal(55.0, 15.0), 20.0, 80.0))
                error_rate = float(np.random.choice([0.0, 1.0]))

            records.append({
                "schema_changed": schema_changed,
                "missing_cols_count": missing_cols_count,
                "null_rate": round(null_rate, 4),
                "duplicate_rate": round(duplicate_rate, 4),
                "contract_violation_count": contract_violation_count,
                "upstream_failed": upstream_failed,
                "cpu_usage": round(cpu_usage, 2),
                "memory_mb": round(memory_mb, 2),
                "runtime_ratio": round(runtime_ratio, 2),
                "error_rate": round(error_rate, 2),
                "throughput_change": round(throughput_change, 4),
                "latency_change": round(latency_change, 4),
                "root_cause": target_class
            })

    df = pd.DataFrame(records)
    # Shuffle
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    df.to_csv(output_csv, index=False)
    print(f"Generated {len(df)} root-cause classification samples -> {output_csv}")
    return df


def generate_lstm_sequences(output_npz: str = "ml/datasets/telemetry_sequences.npz", n_sequences: int = 1200, seq_len: int = 15, seed: int = 42):
    """
    Generates temporal telemetry sequences for training the LSTM Anomaly Detector.
    Sequence features: [cpu_percent, memory_mb, latency_ms, throughput_rps, error_rate]
    """
    np.random.seed(seed)
    Path(output_npz).parent.mkdir(parents=True, exist_ok=True)

    X = []
    y = []  # 0 for normal, 1 for anomalous

    for i in range(n_sequences):
        is_anomaly = (i % 3 == 0)  # ~33% anomaly rate

        seq = []
        base_cpu = np.random.uniform(20.0, 45.0)
        base_mem = np.random.uniform(200.0, 400.0)
        base_lat = np.random.uniform(10.0, 30.0)
        base_tps = np.random.uniform(100.0, 200.0)

        for step in range(seq_len):
            if is_anomaly and step >= (seq_len // 2):
                # Anomaly injected in second half
                cpu = base_cpu + (step * np.random.uniform(3.0, 5.0))
                mem = base_mem + (step * np.random.uniform(30.0, 60.0))
                lat = base_lat * np.random.uniform(2.0, 4.0)
                tps = max(5.0, base_tps * np.random.uniform(0.1, 0.4))
                err = np.random.uniform(0.2, 0.9)
            else:
                cpu = np.clip(base_cpu + np.random.normal(0, 3.0), 5.0, 80.0)
                mem = np.clip(base_mem + np.random.normal(0, 10.0), 100.0, 1000.0)
                lat = np.clip(base_lat + np.random.normal(0, 2.0), 5.0, 60.0)
                tps = np.clip(base_tps + np.random.normal(0, 10.0), 50.0, 300.0)
                err = 0.0

            seq.append([cpu, mem, lat, tps, err])

        X.append(seq)
        y.append(1 if is_anomaly else 0)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)

    np.savez(output_npz, X=X, y=y)
    print(f"Generated {len(X)} temporal sequences of shape {X.shape} -> {output_npz}")
    return X, y

if __name__ == "__main__":
    generate_classification_dataset()
    generate_lstm_sequences()
