import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import DAGViewer from '../components/DAGViewer';
import { Play, Plus, GitBranch, ArrowRight } from 'lucide-react';

export const Pipelines = () => {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [scenario, setScenario] = useState('');
  const [contractVer, setContractVer] = useState('1.0');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = () => {
    api.getPipelines()
      .then((data) => {
        setPipelines(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleRunPipeline = async () => {
    if (!selectedPipeline) return;
    setRunning(true);
    setRunResult(null);
    setError(null);

    try {
      const run = await api.triggerPipelineRun(selectedPipeline.id, {
        dataset_file: 'data/raw/orders.csv',
        contract_version: contractVer,
        failure_scenario: scenario || null,
        run_type: 'MANUAL',
      });
      setRunResult(run);
      setRunning(false);
      fetchPipelines();
    } catch (err) {
      setError(err.message);
      setRunning(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Pipelines</h1>
          <p className="page-subtitle">Registered executable DAG data pipelines in PostgreSQL</p>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: '#ef4444', color: '#f87171' }}>{error}</div>}

      {/* Pipelines List */}
      {loading ? (
        <div className="empty-state">Loading pipelines...</div>
      ) : pipelines.length === 0 ? (
        <div className="empty-state">No pipelines registered. Please run seed script or create one.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pipelines.map((p) => (
            <div key={p.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.15rem' }}>{p.name}</h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    {p.description}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge status={p.status} />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSelectedPipeline(p);
                      setRunResult(null);
                    }}
                  >
                    <Play size={14} /> Run Pipeline
                  </button>
                  <Link to={`/pipelines/${p.id}`} className="btn btn-secondary btn-sm">
                    Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Visual DAG Nodes */}
              <div style={{ background: '#0a0f1a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <DAGViewer tasks={p.tasks} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trigger Run Modal */}
      {selectedPipeline && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: '#f8fafc' }}>Execute: {selectedPipeline.name}</h3>

            <div className="form-group">
              <label className="form-label">Data Contract Version</label>
              <select value={contractVer} onChange={(e) => setContractVer(e.target.value)}>
                <option value="1.0">v1.0 (Strict Orders Contract)</option>
                <option value="2.0">v2.0 (Discount Support)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Controlled Failure Scenario Injection</label>
              <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
                <option value="">None (Standard Healthy Run)</option>
                <option value="missing_column">1. Missing Column ('price' dropped)</option>
                <option value="wrong_datatype">2. Wrong Datatype ('price' string cast)</option>
                <option value="invalid_value">3. Invalid Value (Negative quantity)</option>
                <option value="null_violation">4. Null Constraint ('order_id' is null)</option>
                <option value="duplicate_record">5. Duplicate Record (duplicate key)</option>
                <option value="upstream_dependency">6. Upstream Dependency Crash</option>
                <option value="resource_constraint">7. Resource Constraint (Memory limit)</option>
                <option value="timeout">8. Task Execution Timeout</option>
                <option value="schema_change">9. Schema Change ('order_date' renamed)</option>
                <option value="output_validation">10. Silent Output Data Corruption</option>
              </select>
            </div>

            {runResult && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#090d16', borderRadius: '6px', border: '1px solid #222f46' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Run ID: {runResult.id.slice(0, 8)}</span>
                  <Badge status={runResult.status} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  Duration: {runResult.duration_seconds}s | Rows: {runResult.rows_processed} | Cost: ${runResult.cost}
                </div>
                {runResult.status === 'FAILED' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link to="/failures" className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      Inspect Failure & Run AI Diagnosis →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPipeline(null)} disabled={running}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handleRunPipeline} disabled={running}>
                {running ? 'Executing Real DAG...' : 'Execute Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipelines;
