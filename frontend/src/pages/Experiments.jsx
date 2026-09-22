import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/Badge';
import { FlaskConical, Play, CheckCircle2, TrendingUp, Download, FileText } from 'lucide-react';

export const Experiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(42);
  const [sampleSize, setSampleSize] = useState(150);

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = () => {
    api.getExperiments()
      .then((data) => {
        setExperiments(data);
        if (data.length > 0 && !selectedExperiment) {
          setSelectedExperiment(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleRunExperiment = async () => {
    setRunning(true);
    try {
      const exp = await api.runExperiment({
        name: `Automated Research Benchmark (Seed ${seed})`,
        random_seed: parseInt(seed, 10),
        sample_size: parseInt(sampleSize, 10),
        scenario: 'ALL_SCENARIOS',
      });
      setRunning(false);
      fetchExperiments();
      setSelectedExperiment(exp);
    } catch (err) {
      alert(`Experiment execution failed: ${err.message}`);
      setRunning(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empirical Research Benchmarks</h1>
          <p className="page-subtitle">Reproducible controlled evaluation comparing Baseline methods vs Proposed AI Orchestrator</p>
        </div>
        <button className="btn btn-primary" onClick={handleRunExperiment} disabled={running}>
          <FlaskConical size={14} /> {running ? 'Running Empirical Trials...' : 'Execute Controlled Benchmark Trial'}
        </button>
      </div>

      {/* Trial Parameter Settings */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Configured Random Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: '90px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Evaluation Sample Size:</span>
          <input
            type="number"
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
            style={{ width: '90px' }}
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Strict Zero-Mock standard: Computes live predictions and timings. Saves to CSV and PostgreSQL.
        </span>
      </div>

      {loading ? (
        <div className="empty-state">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FlaskConical size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>Experiment Not Executed</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            No research benchmarks have been executed yet. Click below to run the empirical comparison.
          </p>
          <button className="btn btn-primary" onClick={handleRunExperiment} disabled={running}>
            Run Experiment Now
          </button>
        </div>
      ) : (
        <div>
          {/* Trial Selector */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Experiment Run:</span>
            <select
              value={selectedExperiment?.id || ''}
              onChange={(e) => {
                const found = experiments.find((x) => x.id === e.target.value);
                setSelectedExperiment(found);
              }}
              style={{ flex: 1, maxWidth: '550px' }}
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.id.slice(0, 8)}] {e.name} (Seed: {e.random_seed}) - {new Date(e.created_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {selectedExperiment && (
            <div>
              {/* Comparative Metrics Table */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Comparative Research Results (Baseline vs Proposed)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      CSV Output: <code>{selectedExperiment.result_csv_path}</code>
                    </span>
                  </div>
                  <Badge status={selectedExperiment.status} />
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric Evaluated</th>
                        <th>Project Literature Target</th>
                        <th>Baseline Architecture</th>
                        <th>Proposed Architecture (Measured)</th>
                        <th>Empirical Relative Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedExperiment.results?.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{r.metric_name}</td>
                          <td style={{ color: '#94a3b8' }}>
                            {r.target_value !== null ? `${r.target_value}% Target` : 'N/A'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {r.baseline_value !== null ? `${r.baseline_value}` : 'N/A'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                            {r.proposed_value !== null ? `${r.proposed_value}` : 'N/A'}
                          </td>
                          <td>
                            <span style={{ color: r.relative_improvement_pct >= 0 ? '#34d399' : '#f87171', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                              {r.relative_improvement_pct >= 0 ? `+${r.relative_improvement_pct}%` : `${r.relative_improvement_pct}%`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Experiment Reproducibility Audit */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Trial Reproducibility Configuration & Audit</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Deterministic Seed</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {selectedExperiment.random_seed}
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code Version</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
                      v{selectedExperiment.code_version}
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Model Version</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
                      v{selectedExperiment.model_version}
                    </div>
                  </div>
                </div>

                <pre className="code-block" style={{ fontSize: '0.75rem', maxHeight: '180px' }}>
                  {selectedExperiment.logs || 'No execution logs.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Experiments;
