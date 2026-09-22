# Self-Diagnosing AI Pipeline Orchestrator with Data Contracts, Backfill Planning and Cost-Aware Scheduling

A production-grade university capstone and research platform implementing an intelligent data engineering orchestration lifecycle: declarative versioned data contracts, topological DAG pipeline execution, automated failure triage, temporal sequence anomaly detection via an LSTM neural network, AI-driven multi-class root-cause diagnosis, grounded factual evidence extraction, partition-aware selective backfill optimization, multi-objective cost-aware dynamic scheduling, idempotent automated recovery, and validation via an Independent Mathematical Oracle.

---

## 1. Zero-Fake-Output Guarantee & Research Integrity

This platform adheres strictly to the **Zero-Fake-Output Standard**:
- **No Mock Numbers**: Every chart, table, metric, and percentage is dynamically queried from real PostgreSQL database records.
- **Real ML Models**: PyTorch LSTM recurrent neural network (`ml/models/lstm_anomaly.pt`) and Random Forest classifier (`ml/models/cause_classifier.joblib`) are physically trained, evaluated, saved, loaded, and inferred dynamically on actual execution telemetry features.
- **Truthful Status**: If models or experiments have not been executed, the UI displays `"Model not trained"` or `"Experiment not executed"`.
- **Target vs Measured Separation**: Explicitly distinguishes literature target goals from actual empirical measurements.
- **Independent Oracle**: Uses a mathematically segregated, row-by-row arithmetic engine to verify pipeline output integrity.

---

## 2. Architecture Overview

```
                          DATA SOURCES (CSV / Partitions)
                                         |
                                         v
                           DATA CONTRACT ENGINE (JSON v1/v2)
                                         |
                                         v
                                DAG PIPELINE ENGINE
                     (Validate -> Clean -> Transform -> Aggregate -> Store)
                                         |
                       +-----------------+-----------------+
                       |                                   |
                [SUCCESS PATH]                      [FAILURE PATH]
                       |                                   |
              INDEPENDENT ORACLE                    FAILURE ENGINE
            (Ground-Truth Check: PASS/FAIL)        (Telemetry & Log Capture)
                       |                                   |
                       v                                   v
                  FINAL RESULT                     AI DIAGNOSIS ENGINE
                                            (LSTM Anomaly + Classifier + Baseline)
                                                           |
                                                           v
                                                    EVIDENCE ENGINE
                                            (Grounded Traceable Facts in DB)
                                                           |
                                                           v
                                                    BACKFILL PLANNER
                                            (Selective Partitions vs Full Rerun)
                                                           |
                                                           v
                                                 COST-AWARE SCHEDULER
                                            (Small/Med/Large + Multi-Objective)
                                                           |
                                                           v
                                                    RECOVERY ENGINE
                                            (Idempotent Task Re-execution)
                                                           |
                                                           v
                                                  INDEPENDENT ORACLE
                                            (Re-Validation & PASS/FAIL)
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Recharts, Lucide Icons, Axios.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic.
- **Database**: PostgreSQL 18 / 16 (Local port 5433 / Container port 5432).
- **Machine Learning**: PyTorch (LSTM Anomaly Detector), Scikit-Learn (Random Forest Root-Cause Classifier, Isolation Forest Baseline).
- **Data Engineering**: Pandas, NumPy, Psutil.
- **Monitoring**: Prometheus client & exporter (`/metrics`).
- **Containerization**: Docker, Docker Compose, Nginx.
- **Testing**: Pytest (16 comprehensive unit & integration tests).

---

## 4. Directory Structure

```
self-diagnosing-pipeline/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & router assembly
│   │   ├── config.py                   # Pydantic environment configuration
│   │   ├── database.py                 # SQLAlchemy engine & session management
│   │   ├── models.py                   # 22 database models
│   │   ├── schemas.py                  # Pydantic v2 schemas
│   │   ├── api/                        # 12 REST API route modules
│   │   ├── contracts/                  # Contract loader & validation engine
│   │   ├── pipeline/                   # DAG engine, operators & Independent Oracle
│   │   ├── anomaly/                    # PyTorch LSTM & Isolation Forest detectors
│   │   ├── diagnosis/                  # AI classifier, baseline rules & evidence
│   │   ├── backfill/                   # Partition-aware selective backfill planner
│   │   ├── scheduler/                  # Cost-aware multi-objective scheduler
│   │   ├── recovery/                   # Idempotent recovery executor & validator
│   │   ├── experiments/                # Controlled research benchmark runner
│   │   └── monitoring/                 # Prometheus metrics exporter
│   ├── alembic/                        # Database migration scripts
│   ├── tests/                          # 16 automated tests
│   ├── requirements.txt                # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/                 # Sidebar, Header, Badge, DAGViewer
│   │   ├── pages/                      # 15 dedicated engineering UI pages
│   │   ├── services/api.js             # Axios API service client
│   │   ├── App.jsx                     # Router configurations
│   │   └── index.css                   # Dark theme design system
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── data/                               # raw, processed, contracts, failures, synthetic
├── ml/                                 # Training datasets, models, training scripts
├── experiments/                        # Benchmark results and reproducible CSVs
├── monitoring/                         # Prometheus configuration
├── scripts/                            # Seed script & dataset generator
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 16+ or Docker

### Option A: Local Execution (Verified)
1. **Initialize Database and Seed Configuration**:
   ```bash
   python scripts/seed_demo.py
   ```
2. **Train Machine Learning Models**:
   ```bash
   python ml/train_lstm.py
   python ml/train_classifier.py
   ```
3. **Start FastAPI Backend (Port 8000)**:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
   ```
4. **Start React Frontend (Port 5173)**:
   ```bash
   cd frontend
   npm run dev
   ```
5. **Open Browser**:
   Navigate to `http://localhost:5173`.

### Option B: Docker Compose Deployment
```bash
docker compose up --build
```
- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI API & Docs**: `http://localhost:8000/docs`
- **Prometheus Metrics**: `http://localhost:9090`

---

## 6. End-to-End Demonstration Workflow

Follow these steps to demonstrate the complete self-diagnosing capability:

1. **Open Dashboard**:
   View real-time operational KPIs dynamically retrieved from PostgreSQL.
2. **Trigger Healthy Pipeline Run**:
   Go to **Pipelines & DAG** -> click **Run Pipeline** -> select **None (Standard Healthy Run)**.
   Observe all 5 tasks (`validate_contract` -> `clean_data` -> `transform_orders` -> `aggregate_metrics` -> `store_results`) execute with `SUCCESS`, rows processed = 500, and Independent Oracle status = `PASS`.
3. **Inject Controlled Failure Scenario**:
   Click **Run Pipeline** -> select **1. Missing Column ('price' dropped)** -> click **Execute Now**.
   Observe task `validate_contract` terminate with `FAILED`, downstream tasks transition to `BLOCKED`, and a real `ContractViolation` and `Failure` stored in PostgreSQL.
4. **Inspect Failures**:
   Navigate to **Failures & Triage** -> inspect the error message and telemetry snapshot -> click **Diagnose AI**.
5. **AI Root-Cause Diagnosis & Evidence**:
   Observe real model inference:
   - Primary Diagnosis: `SCHEMA_CHANGE` (with calibrated model probability).
   - Ranked Root Causes (top-3 distribution).
   - Temporal Telemetry Anomaly (PyTorch LSTM score).
   - Traceable concrete evidence items extracted from database violations.
6. **Generate Backfill Plan**:
   Click **Generate Backfill Plan** -> choose **Proposed (Selective)**.
   Observe that only affected partitions (`2026-09-10`, `2026-09-11`, etc.) and affected downstream tasks are scheduled, saving up to ~80% duration compared to full rerun baseline.
7. **Cost-Aware Scheduling**:
   Navigate to **Cost Scheduler** -> adjust Cost Weight ($\alpha$) vs Execution Time Weight ($\beta$) sliders.
   Click **Compute Optimal Schedule Matrix** to evaluate Small, Medium, and Large tiers and select the optimal tier.
8. **Automated Recovery & Independent Oracle**:
   Click **Proceed to Automated Recovery** -> click **Execute Recovery Run**.
   Observe sequential re-execution of affected tasks. At completion, the Independent Oracle calculates ground truth and marks validation status = `PASS` and recovery = `SUCCESS`.
9. **Research Benchmark Trials**:
   Navigate to **Research Benchmarks** -> click **Execute Controlled Benchmark Trial**.
   Inspect Top-1 & Top-3 accuracy comparisons, makespan reductions, and download the reproducible CSV.

---

## 7. Automated Testing Suite

Run the full automated pytest suite covering all 16 required test scenarios:
```bash
python -m pytest backend/tests/test_all_requirements.py -v
```

### Verified Test Cases (16 / 16 Passing):
- `test_01_valid_dataset_passes`: Verifies clean CSV pipeline execution and row processing.
- `test_02_missing_column_fails`: Injects missing required column `price` and verifies contract violation.
- `test_03_wrong_datatype_fails`: Injects string value into float column and asserts datatype failure.
- `test_04_invalid_value_fails`: Injects negative quantity and asserts min value violation.
- `test_05_null_violation_fails`: Injects null into non-nullable key and asserts failure.
- `test_06_duplicate_violation_fails`: Injects duplicate primary keys and asserts unique constraint failure.
- `test_07_upstream_dependency_blocks_downstream`: Forces upstream crash and verifies downstream tasks become `BLOCKED`.
- `test_08_resource_failure_diagnosis`: Injects memory constraint and asserts resource diagnosis.
- `test_09_timeout_failure_diagnosis`: Injects delay and asserts timeout diagnosis.
- `test_10_backfill_plan_identifies_correct_partitions`: Verifies partition pruning in backfill planner.
- `test_11_scheduler_respects_constraints`: Verifies multi-objective ranking and tier feasibility.
- `test_12_recovery_actually_executes`: Verifies end-to-end recovery re-execution.
- `test_13_recovery_failure_recorded`: Verifies recovery error tracking in PostgreSQL.
- `test_14_independent_oracle_detects_mismatch`: Deliberately injects corrupted output and asserts Oracle detects `FAIL`.
- `test_15_repeat_recovery_is_idempotent`: Executes duplicate recovery and verifies idempotency protection.
- `test_16_api_endpoints_work`: Tests FastAPI REST endpoints via TestClient.

---

## 8. API Documentation Summary

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Live backend and service health check |
| `GET` | `/metrics` | Prometheus metrics exporter |
| `GET` | `/api/dashboard/summary` | Real-time KPI and chart telemetry summary |
| `GET` | `/api/pipelines` | List all registered DAG pipelines |
| `POST` | `/api/pipelines` | Register a new DAG pipeline |
| `POST` | `/api/pipelines/{id}/run` | Execute pipeline run with optional failure scenario |
| `GET` | `/api/runs` | List historical pipeline runs |
| `GET` | `/api/runs/{id}` | Get run details and execution logs |
| `GET` | `/api/contracts` | List registered data contracts |
| `POST` | `/api/contracts` | Create/version a data contract |
| `POST` | `/api/contracts/validate` | Validate dataset CSV against contract version |
| `GET` | `/api/contracts/violations` | List granular contract violations from PostgreSQL |
| `GET` | `/api/failures` | List pipeline failures with telemetry snapshots |
| `POST` | `/api/failures/inject` | Trigger controlled failure scenario |
| `POST` | `/api/failures/{id}/diagnose` | Run AI root-cause model inference |
| `GET` | `/api/failures/{id}/diagnosis` | Retrieve diagnosis, ranking, and evidence |
| `POST` | `/api/backfill/plan` | Generate selective or baseline backfill plan |
| `POST` | `/api/schedules/generate` | Compute cost-aware candidate schedule matrix |
| `POST` | `/api/recovery/execute` | Execute idempotent recovery run with Oracle check |
| `GET` | `/api/recovery/{id}` | Get recovery task execution and Oracle diff status |
| `POST` | `/api/experiments/run` | Execute controlled research benchmark trial |
| `GET` | `/api/experiments` | List completed research experiments |
| `GET` | `/api/models` | List trained ML models and evaluation metrics |
| `POST` | `/api/models/train` | Trigger retraining of LSTM and Classifier models |
| `GET` | `/api/datasets` | List registered datasets with SHA-256 hashes |
| `POST` | `/api/datasets/upload` | Upload and hash custom CSV dataset |
| `GET` | `/api/logs` | Query immutable audit trail logs |
"# cap" 
