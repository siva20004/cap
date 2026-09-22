import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { BrainCircuit, ShieldCheck, Activity, ArrowRight, RefreshCw, Layers } from 'lucide-react';

export const Diagnosis = () => {
  const { failureId } = useParams();
  const [failures, setFailures] = useState([]);
  const [activeFailureId, setActiveFailureId] = useState(failureId || '');
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getFailures().then((data) => {
      setFailures(data);
      if (!activeFailureId && data.length > 0) {
        setActiveFailureId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (activeFailureId) {
      setLoading(true);
      api.getFailureDiagnosis(activeFailureId)
        .then((data) => {
          setDiagnosis(data);
          setLoading(false);
        })
        .catch(() => {
          setDiagnosis(null);
          setLoading(false);
        });
    }
  }, [activeFailureId]);

  const handleRunDiagnosis = async () => {
    if (!activeFailureId) return;
    setDiagnosing(true);
    try {
      const diag = await api.diagnoseFailure(activeFailureId);
      setDiagnosis(diag);
      setDiagnosing(false);
    } catch (err) {
      alert(`Diagnosis execution error: ${err.message}`);
      setDiagnosing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Root-Cause Diagnosis & Evidence</h1>
          <p className="page-subtitle">Real-time model inference from telemetry and contract violations stored in PostgreSQL</p>
        </div>
        {activeFailureId && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleRunDiagnosis} disabled={diagnosing}>
              <RefreshCw size={14} /> {diagnosing ? 'Running Model...' : 'Re-Run Diagnosis'}
            </button>
            <Link to={`/backfill/${activeFailureId}`} className="btn btn-primary">
              Generate Backfill Plan <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Failure Selector */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Select Failure Incident:</span>
        <select
          value={activeFailureId}
          onChange={(e) => setActiveFailureId(e.target.value)}
          style={{ flex: 1, maxWidth: '500px' }}
        >
          {failures.map((f) => (
            <option key={f.id} value={f.id}>
              [{f.id.slice(0, 8)}] {f.pipeline_name} - {f.task_name} ({f.failure_type}) - {new Date(f.timestamp).toLocaleTimeString()}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Loading diagnosis from database...</div>
      ) : !diagnosis ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BrainCircuit size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>Diagnosis Not Yet Computed</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Invoke the trained Random Forest and PyTorch LSTM model to analyze telemetry and contract violations.
          </p>
          <button className="btn btn-primary" onClick={handleRunDiagnosis} disabled={diagnosing}>
            {diagnosing ? 'Running AI Models...' : 'Execute AI Diagnosis Now'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {/* Top Diagnosis Result */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Root Cause Multi-Class Ranking</h3>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Model: {diagnosis.model_version}</span>
            </div>

            <div style={{ marginBottom: '1.5rem', background: '#0a101d', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Primary Diagnosed Root Cause</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>
                {diagnosis.predicted_cause.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Confidence: <strong style={{ color: '#f1f5f9' }}>{(diagnosis.confidence * 100).toFixed(2)}%</strong> (Computed Model Probability)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Ranked Probability Distribution:</div>
              {diagnosis.ranked_causes?.map((rc, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ width: '20px', color: '#64748b', fontWeight: 600 }}>#{idx + 1}</span>
                  <span style={{ width: '160px', color: idx === 0 ? '#f1f5f9' : '#94a3b8', fontWeight: idx === 0 ? 600 : 400 }}>
                    {rc.cause}
                  </span>
                  <div style={{ flex: 1, background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${rc.probability * 100}%`,
                        height: '100%',
                        background: idx === 0 ? '#38bdf8' : '#64748b',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span style={{ width: '55px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    {(rc.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Temporal LSTM Anomaly Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Temporal Telemetry Anomaly (LSTM)</h3>
              <Badge status={diagnosis.anomaly_status}>{diagnosis.anomaly_status}</Badge>
            </div>

            <div style={{ background: '#0a101d', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>LSTM Sequence Anomaly Score</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: diagnosis.anomaly_score >= 0.5 ? '#f87171' : '#34d399', marginTop: '0.25rem' }}>
                {diagnosis.anomaly_score.toFixed(4)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Threshold: 0.5000 | Model: PyTorch Recurrent Neural Network
              </div>
            </div>

            <div style={{ background: '#0a101d', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Deterministic Baseline Comparison</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.25rem' }}>
                Baseline Rule: <code>{diagnosis.baseline_cause}</code>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                AI ML Classifier: <strong style={{ color: '#38bdf8' }}>{diagnosis.predicted_cause}</strong>
              </div>
            </div>
          </div>

          {/* Concrete Evidence Panel */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3 className="card-title">Recorded Concrete Evidence Items</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Traceable directly to PostgreSQL records</span>
            </div>

            {diagnosis.evidence?.length === 0 ? (
              <div className="empty-state">No specific evidence records captured.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {diagnosis.evidence?.map((item, idx) => (
                  <div key={idx} style={{ background: '#0c121e', padding: '0.85rem 1rem', borderRadius: '6px', borderLeft: '3px solid #38bdf8', fontSize: '0.85rem', color: '#e2e8f0' }}>
                    • {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw Feature Vector */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3 className="card-title">Extracted Model Input Feature Vector</h3>
            </div>
            <pre className="code-block" style={{ fontSize: '0.78rem' }}>
              {JSON.stringify(diagnosis.features, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diagnosis;
