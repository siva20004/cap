// Standalone / Offline Mock Service for Vercel deployment
// Provides realistic data & state updates when backend is not deployed.

const getStored = (key, defaultVal) => {
  try {
    const data = localStorage.getItem(`demo_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setStored = (key, val) => {
  try {
    localStorage.setItem(`demo_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

// Initial Pipelines
const defaultPipelines = [
  {
    id: 'pipe-ecommerce-01',
    name: 'E-Commerce Order Processing DAG',
    description: 'Validates, cleans, transforms, aggregates and stores daily partitioned customer orders.',
    schedule_cron: '0 2 * * *',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    tasks: [
      { id: 'task-1', pipeline_id: 'pipe-ecommerce-01', task_name: 'validate_contract', operator_type: 'contract_validator', upstream_tasks: [], retry_limit: 1, timeout_seconds: 300, created_at: new Date().toISOString() },
      { id: 'task-2', pipeline_id: 'pipe-ecommerce-01', task_name: 'clean_data', operator_type: 'data_cleaner', upstream_tasks: ['validate_contract'], retry_limit: 1, timeout_seconds: 300, created_at: new Date().toISOString() },
      { id: 'task-3', pipeline_id: 'pipe-ecommerce-01', task_name: 'transform_orders', operator_type: 'data_transformer', upstream_tasks: ['clean_data'], retry_limit: 2, timeout_seconds: 450, created_at: new Date().toISOString() },
      { id: 'task-4', pipeline_id: 'pipe-ecommerce-01', task_name: 'aggregate_metrics', operator_type: 'data_aggregator', upstream_tasks: ['transform_orders'], retry_limit: 1, timeout_seconds: 300, created_at: new Date().toISOString() },
      { id: 'task-5', pipeline_id: 'pipe-ecommerce-01', task_name: 'store_results', operator_type: 'db_loader', upstream_tasks: ['aggregate_metrics'], retry_limit: 0, timeout_seconds: 600, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 'pipe-telemetry-02',
    name: 'Real-Time Telemetry & Anomaly Stream',
    description: 'Sliding LSTM temporal anomaly scoring across CPU, memory and IO spikes.',
    schedule_cron: '*/15 * * * *',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    tasks: [
      { id: 'task-t1', pipeline_id: 'pipe-telemetry-02', task_name: 'ingest_metrics', operator_type: 'stream_consumer', upstream_tasks: [], retry_limit: 1, timeout_seconds: 120, created_at: new Date().toISOString() },
      { id: 'task-t2', pipeline_id: 'pipe-telemetry-02', task_name: 'evaluate_lstm', operator_type: 'ml_inferencer', upstream_tasks: ['ingest_metrics'], retry_limit: 0, timeout_seconds: 240, created_at: new Date().toISOString() },
      { id: 'task-t3', pipeline_id: 'pipe-telemetry-02', task_name: 'publish_alerts', operator_type: 'notifier', upstream_tasks: ['evaluate_lstm'], retry_limit: 3, timeout_seconds: 60, created_at: new Date().toISOString() }
    ]
  }
];

// Initial Runs
const defaultRuns = [
  {
    id: 'run-98124-healthy',
    pipeline_id: 'pipe-ecommerce-01',
    pipeline_name: 'E-Commerce Order Processing DAG',
    run_type: 'MANUAL',
    status: 'SUCCESS',
    start_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    end_time: new Date(Date.now() - 3600000 * 2 + 18500).toISOString(),
    duration_seconds: 18.5,
    rows_processed: 1250,
    cost_usd: 0.015,
    input_dataset: 'orders_valid.csv',
    output_dataset: 'orders_aggregated_output.csv',
    error_message: null
  },
  {
    id: 'run-98125-missing-col',
    pipeline_id: 'pipe-ecommerce-01',
    pipeline_name: 'E-Commerce Order Processing DAG',
    run_type: 'MANUAL',
    status: 'FAILED',
    start_time: new Date(Date.now() - 3600000 * 1).toISOString(),
    end_time: new Date(Date.now() - 3600000 * 1 + 2100).toISOString(),
    duration_seconds: 2.1,
    rows_processed: 0,
    cost_usd: 0.002,
    input_dataset: 'orders_missing_column.csv',
    output_dataset: null,
    error_message: 'ContractViolationError: Required column "price" missing from incoming dataset.'
  },
  {
    id: 'run-98126-null-violation',
    pipeline_id: 'pipe-ecommerce-01',
    pipeline_name: 'E-Commerce Order Processing DAG',
    run_type: 'SCHEDULED',
    status: 'FAILED',
    start_time: new Date(Date.now() - 1800000).toISOString(),
    end_time: new Date(Date.now() - 1800000 + 3400).toISOString(),
    duration_seconds: 3.4,
    rows_processed: 820,
    cost_usd: 0.003,
    input_dataset: 'orders_null_violation.csv',
    output_dataset: null,
    error_message: 'ContractViolationError: Column "order_id" contains 14 null values violating non-nullable constraint.'
  }
];

// Initial Contracts
const defaultContracts = [
  {
    id: 'contract-orders',
    table_name: 'orders',
    description: 'E-Commerce transactions schema with strict types, nullability and range constraints.',
    active_version: '1.0',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    schema_definition: {
      columns: [
        { name: 'order_id', type: 'string', nullable: false, unique: true },
        { name: 'customer_id', type: 'string', nullable: false },
        { name: 'order_date', type: 'datetime', nullable: false },
        { name: 'product_id', type: 'string', nullable: false },
        { name: 'quantity', type: 'integer', min: 1, max: 100 },
        { name: 'price', type: 'float', min: 0.01 },
        { name: 'status', type: 'string', allowed_values: ['PENDING', 'COMPLETED', 'CANCELLED'] }
      ]
    }
  }
];

// Initial Violations
const defaultViolations = [
  {
    id: 'viol-001',
    run_id: 'run-98125-missing-col',
    column_name: 'price',
    rule_type: 'MISSING_COLUMN',
    severity: 'CRITICAL',
    violation_details: { expected: 'price (float)', actual: 'null', impact: 'Calculations for net revenue blocked.' },
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: 'viol-002',
    run_id: 'run-98126-null-violation',
    column_name: 'order_id',
    rule_type: 'NOT_NULL_VIOLATION',
    severity: 'CRITICAL',
    violation_details: { count: 14, expected: 'non-null unique identifier' },
    timestamp: new Date(Date.now() - 1800000).toISOString()
  }
];

// Initial Failures & AI Diagnoses
const defaultFailures = [
  {
    id: 'fail-98125',
    run_id: 'run-98125-missing-col',
    task_name: 'validate_contract',
    failure_type: 'SCHEMA_CHANGE',
    error_message: 'ContractViolationError: Required column "price" missing from incoming dataset.',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    has_diagnosis: true
  },
  {
    id: 'fail-98126',
    run_id: 'run-98126-null-violation',
    task_name: 'validate_contract',
    failure_type: 'DATA_QUALITY',
    error_message: 'ContractViolationError: Null values detected in primary key order_id.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    has_diagnosis: true
  }
];

const defaultDiagnoses = {
  'fail-98125': {
    id: 'diag-98125',
    failure_id: 'fail-98125',
    predicted_cause: 'schema_change',
    baseline_cause: 'schema_change',
    confidence: 0.965,
    cause_probabilities: {
      schema_change: 0.965,
      data_quality: 0.024,
      dependency_failure: 0.007,
      resource_constraint: 0.002,
      timeout: 0.001,
      unknown: 0.001
    },
    lstm_anomaly_score: 0.12,
    lstm_anomaly_detected: false,
    evidence: [
      { evidence_type: 'CONTRACT_VIOLATION', rule_triggered: 'MISSING_REQUIRED_COLUMN', observed_value: 'missing: [price]', expected_value: 'price: float', description: 'Upstream producer dropped column "price" without incrementing contract version.' },
      { evidence_type: 'TASK_ERROR_LOG', rule_triggered: 'VALIDATE_CONTRACT_EXIT', observed_value: 'exit_code=1', expected_value: 'exit_code=0', description: 'Pipeline task stopped downstream execution to preserve data integrity.' }
    ],
    recommended_action: 'Perform partition-aware backfill using updated schema orders_v2.json.'
  },
  'fail-98126': {
    id: 'diag-98126',
    failure_id: 'fail-98126',
    predicted_cause: 'data_quality',
    baseline_cause: 'data_quality',
    confidence: 0.941,
    cause_probabilities: {
      data_quality: 0.941,
      schema_change: 0.038,
      dependency_failure: 0.012,
      resource_constraint: 0.005,
      timeout: 0.002,
      unknown: 0.002
    },
    lstm_anomaly_score: 0.35,
    lstm_anomaly_detected: false,
    evidence: [
      { evidence_type: 'NULL_CHECK', rule_triggered: 'NOT_NULL_CONSTRAINT', observed_value: '14 null order_ids', expected_value: '0 nulls', description: 'Corrupted payload ingested from staging queue.' }
    ],
    recommended_action: 'Filter null keys and backfill partition 2026-09-22.'
  }
};

export const mockStore = {
  // Auth
  register: (userData) => {
    const users = getStored('users', []);
    const emailClean = userData.email.trim().toLowerCase();
    const existing = users.find((u) => u.email === emailClean);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }
    const newUser = {
      id: `user-${Date.now()}`,
      email: emailClean,
      first_name: userData.first_name,
      last_name: userData.last_name,
      country: userData.country || 'United States',
      role: 'ENGINEER',
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    setStored('users', users);
    return newUser;
  },

  login: (email, password) => {
    const users = getStored('users', []);
    const emailClean = email.trim().toLowerCase();
    let user = users.find((u) => u.email === emailClean);
    if (!user) {
      // Auto-provision demo account so user is never blocked
      user = {
        id: `user-${Date.now()}`,
        email: emailClean,
        first_name: emailClean.split('@')[0],
        last_name: 'Engineer',
        country: 'United States',
        role: 'ENGINEER',
        created_at: new Date().toISOString()
      };
      users.push(user);
      setStored('users', users);
    }
    const token = `standalone-jwt-token-${Date.now()}`;
    setStored('current_user', user);
    localStorage.setItem('auth_token', token);
    return { access_token: token, token_type: 'bearer', user };
  },

  getMe: () => {
    const user = getStored('current_user', null);
    if (user) return user;
    return {
      id: 'demo-user-1',
      email: 'engineer@demo.local',
      first_name: 'Demo',
      last_name: 'Engineer',
      country: 'United States',
      role: 'ENGINEER',
      created_at: new Date().toISOString()
    };
  },

  // Dashboard
  getDashboardSummary: () => {
    const runs = getStored('runs', defaultRuns);
    const failures = getStored('failures', defaultFailures);
    const violations = getStored('violations', defaultViolations);
    const pipelines = getStored('pipelines', defaultPipelines);
    return {
      total_pipelines: pipelines.length,
      total_runs: runs.length + 18,
      successful_runs: runs.filter((r) => r.status === 'SUCCESS').length + 16,
      failed_runs: runs.filter((r) => r.status === 'FAILED').length + 2,
      contract_violations: violations.length + 4,
      active_recoveries: 1,
      avg_recovery_time_seconds: 14.8,
      total_processing_cost: 0.185,
      run_status_distribution: { SUCCESS: 20, FAILED: 4, RUNNING: 0 },
      failure_type_distribution: { schema_change: 2, data_quality: 1, timeout: 1 },
      cost_trend: [
        { date: '2026-09-18', cost: 0.024 },
        { date: '2026-09-19', cost: 0.038 },
        { date: '2026-09-20', cost: 0.041 },
        { date: '2026-09-21', cost: 0.052 },
        { date: '2026-09-22', cost: 0.030 }
      ],
      recovery_time_trend: [
        { date: '2026-09-18', duration: 18.2 },
        { date: '2026-09-19', duration: 15.4 },
        { date: '2026-09-20', duration: 14.1 },
        { date: '2026-09-21', duration: 12.8 },
        { date: '2026-09-22', duration: 11.5 }
      ]
    };
  },

  // Pipelines
  getPipelines: () => getStored('pipelines', defaultPipelines),
  getPipeline: (id) => {
    const list = getStored('pipelines', defaultPipelines);
    return list.find((p) => p.id === id) || list[0];
  },
  createPipeline: (data) => {
    const list = getStored('pipelines', defaultPipelines);
    const newPipe = {
      ...data,
      id: `pipe-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'ACTIVE'
    };
    list.unshift(newPipe);
    setStored('pipelines', list);
    return newPipe;
  },
  triggerPipelineRun: (id, triggerData) => {
    const runs = getStored('runs', defaultRuns);
    const pipelines = getStored('pipelines', defaultPipelines);
    const pipe = pipelines.find((p) => p.id === id) || pipelines[0];
    const isFailureScenario = !!triggerData?.failure_scenario;
    const newRun = {
      id: `run-${Date.now()}`,
      pipeline_id: pipe.id,
      pipeline_name: pipe.name,
      run_type: 'MANUAL',
      status: isFailureScenario ? 'FAILED' : 'SUCCESS',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 4500).toISOString(),
      duration_seconds: isFailureScenario ? 2.3 : 15.6,
      rows_processed: isFailureScenario ? 0 : 1500,
      cost_usd: isFailureScenario ? 0.003 : 0.019,
      input_dataset: triggerData?.dataset_file || 'orders_dataset.csv',
      output_dataset: isFailureScenario ? null : 'aggregated_orders.csv',
      error_message: isFailureScenario ? `Injected failure: ${triggerData.failure_scenario}` : null
    };
    runs.unshift(newRun);
    setStored('runs', runs);
    return newRun;
  },

  // Runs
  getRuns: () => getStored('runs', defaultRuns),
  getRun: (id) => {
    const runs = getStored('runs', defaultRuns);
    return runs.find((r) => r.id === id) || runs[0];
  },

  // Contracts
  getContracts: () => getStored('contracts', defaultContracts),
  getContractViolations: () => getStored('violations', defaultViolations),
  validateDatasetContract: (data) => ({
    status: 'FAIL',
    violations_count: 2,
    violations: [
      { column: 'price', error: 'Missing required field' },
      { column: 'quantity', error: 'Negative value detected (-5)' }
    ]
  }),

  // Failures & Diagnoses
  getFailures: () => getStored('failures', defaultFailures),
  getFailure: (id) => {
    const list = getStored('failures', defaultFailures);
    return list.find((f) => f.id === id) || list[0];
  },
  diagnoseFailure: (id) => {
    return defaultDiagnoses[id] || defaultDiagnoses['fail-98125'];
  },
  getFailureDiagnosis: (id) => {
    return defaultDiagnoses[id] || defaultDiagnoses['fail-98125'];
  },

  // Backfill
  createBackfillPlan: (data) => ({
    id: `plan-${Date.now()}`,
    failure_id: data.failure_id,
    strategy: 'proposed_selective',
    affected_partitions: ['2026-09-21', '2026-09-22'],
    affected_tasks: ['clean_data', 'transform_orders', 'aggregate_metrics'],
    estimated_runtime_seconds: 45.2,
    estimated_cost_usd: 0.048,
    baseline_full_runtime_seconds: 198.5,
    baseline_full_cost_usd: 0.215,
    savings_percentage: 77.6,
    created_at: new Date().toISOString()
  }),
  getBackfillPlan: (id) => ({
    id,
    strategy: 'proposed_selective',
    affected_partitions: ['2026-09-21', '2026-09-22'],
    affected_tasks: ['clean_data', 'transform_orders', 'aggregate_metrics'],
    estimated_runtime_seconds: 45.2,
    estimated_cost_usd: 0.048,
    baseline_full_runtime_seconds: 198.5,
    baseline_full_cost_usd: 0.215,
    savings_percentage: 77.6
  }),
  getPlansByFailure: (failureId) => [
    {
      id: `plan-${failureId}`,
      failure_id: failureId,
      strategy: 'proposed_selective',
      affected_partitions: ['2026-09-21', '2026-09-22'],
      affected_tasks: ['clean_data', 'transform_orders', 'aggregate_metrics'],
      estimated_runtime_seconds: 45.2,
      estimated_cost_usd: 0.048
    }
  ],

  // Scheduler
  generateSchedules: (data) => [
    { id: 'tier-small', tier: 'small', vcpu: 1, ram_gb: 2, estimated_cost: 0.035, estimated_time_seconds: 75, objective_score: 0.42, is_recommended: false },
    { id: 'tier-medium', tier: 'medium', vcpu: 2, ram_gb: 4, estimated_cost: 0.048, estimated_time_seconds: 45, objective_score: 0.28, is_recommended: true },
    { id: 'tier-large', tier: 'large', vcpu: 4, ram_gb: 8, estimated_cost: 0.092, estimated_time_seconds: 22, objective_score: 0.39, is_recommended: false }
  ],
  getSchedule: (id) => ({
    id,
    tier: 'medium',
    vcpu: 2,
    ram_gb: 4,
    estimated_cost: 0.048,
    estimated_time_seconds: 45
  }),
  getSchedulesByPlan: () => [
    { id: 'sched-1', tier: 'medium', vcpu: 2, ram_gb: 4, estimated_cost: 0.048, estimated_time_seconds: 45, is_recommended: true }
  ],

  // Recovery
  executeRecovery: (data) => ({
    id: `rec-${Date.now()}`,
    status: 'SUCCESS',
    oracle_validation_status: 'PASS',
    duration_seconds: 12.4,
    actual_cost: 0.041,
    oracle_diff_summary: { matched_records: 1250, discrepancies: 0 },
    message: 'Partition recovery executed idempotently. Oracle independent validation PASSED with 100% data integrity.'
  }),
  getRecovery: (id) => ({
    id,
    status: 'SUCCESS',
    oracle_validation_status: 'PASS',
    duration_seconds: 12.4,
    actual_cost: 0.041,
    oracle_diff_summary: { matched_records: 1250, discrepancies: 0 }
  }),
  getRecoveries: () => [
    {
      id: 'rec-001',
      status: 'SUCCESS',
      oracle_validation_status: 'PASS',
      duration_seconds: 12.4,
      actual_cost: 0.041,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],

  // Experiments
  getExperiments: () => [
    {
      id: 'exp-benchmark-01',
      name: 'AI Diagnosis vs Baseline Accuracy Benchmark',
      scenario: 'Random failure injection across 100 pipeline runs',
      ai_top1_accuracy: 0.942,
      ai_top3_accuracy: 0.991,
      baseline_accuracy: 0.684,
      relative_improvement: '+37.7%',
      status: 'COMPLETED'
    },
    {
      id: 'exp-backfill-02',
      name: 'Partition-Aware Selective Backfill vs Full Rerun',
      scenario: '30-day historical time-series dataset partition fault',
      selective_runtime_seconds: 42.1,
      full_rerun_runtime_seconds: 210.8,
      cost_reduction_percentage: 78.4,
      status: 'COMPLETED'
    }
  ],
  runExperiment: (data) => ({
    id: `exp-${Date.now()}`,
    name: data.name || 'Automated Research Experiment',
    status: 'COMPLETED',
    results: { top1_accuracy: 0.95, time_saved_pct: 79.2 }
  }),

  // Models
  getModels: () => [
    { id: 'model-lstm', model_name: 'LSTM Telemetry Sequence Anomaly Detector', version: 'v1.4.0', model_type: 'LSTM_RECURRENT', status: 'TRAINED', trained_at: new Date(Date.now() - 86400000 * 2).toISOString(), evaluation_metrics: { loss: 0.0142, precision: 0.952, recall: 0.961 } },
    { id: 'model-classifier', model_name: 'Multi-Class Root-Cause Classifier', version: 'v2.1.0', model_type: 'RANDOM_FOREST', status: 'TRAINED', trained_at: new Date(Date.now() - 86400000 * 2).toISOString(), evaluation_metrics: { accuracy: 0.958, f1_macro: 0.954 } }
  ],
  triggerModelTraining: (data) => ({
    status: 'SUCCESS',
    message: `Model ${data.model_type || 'LSTM'} successfully retrained on 1,000 synthetic telemetry sequences. Validation accuracy: 96.4%.`
  }),

  // Datasets
  getDatasets: () => [
    { id: 'ds-01', name: 'orders_valid.csv', row_count: 1250, column_count: 7, sha256_hash: 'a39fbc81...', is_synthetic: false },
    { id: 'ds-02', name: 'orders_missing_column.csv', row_count: 1250, column_count: 6, sha256_hash: 'c8712e09...', is_synthetic: true },
    { id: 'ds-03', name: 'orders_null_violation.csv', row_count: 1250, column_count: 7, sha256_hash: 'd45f91ab...', is_synthetic: true }
  ],
  uploadDataset: () => ({ id: `ds-${Date.now()}`, name: 'uploaded_orders.csv', status: 'READY' }),

  // Logs
  getAuditLogs: () => [
    { id: 'log-1', action: 'USER_LOGIN', user_or_system: 'palaparthisiva907@gmail.com', result: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'log-2', action: 'PIPELINE_RUN', user_or_system: 'SYSTEM_SCHEDULER', result: 'SUCCESS', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'log-3', action: 'DATA_CONTRACT_VALIDATION', user_or_system: 'VALIDATOR_WORKER', result: 'FAILED', timestamp: new Date(Date.now() - 7200000).toISOString() }
  ]
};
