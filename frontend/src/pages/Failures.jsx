import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { Flame, BrainCircuit, Eye, ArrowRight } from 'lucide-react';

export const Failures = () => {
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFailures();
    const timer = setInterval(fetchFailures, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchFailures = () => {
    api.getFailures()
      .then((data) => {
        setFailures(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Failure Triage & Anomaly Logs</h1>
          <p className="page-subtitle">Recorded pipeline disruptions with telemetry snapshots and affected partitions</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Failure ID</th>
              <th>Pipeline</th>
              <th>Failed Task</th>
              <th>Failure Scenario</th>
              <th>Timestamp</th>
              <th>Affected Partitions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && failures.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">Loading failures...</td></tr>
            ) : failures.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No pipeline failures recorded. Systems healthy.</td></tr>
            ) : (
              failures.map((f) => (
                <tr key={f.id}>
                  <td><code>{f.id.slice(0, 8)}</code></td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{f.pipeline_name}</td>
                  <td><code>{f.task_name}</code></td>
                  <td><Badge status="FAILED">{f.failure_type}</Badge></td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(f.timestamp).toLocaleString()}</td>
                  <td>
                    {f.affected_partitions?.length > 0 ? (
                      <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                        {f.affected_partitions.join(', ')}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>None flagged</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFailure(f)}>
                        <Eye size={12} /> Details
                      </button>
                      <Link to={`/diagnosis/${f.id}`} className="btn btn-primary btn-sm">
                        <BrainCircuit size={12} /> Diagnose AI
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Failure Detail Modal */}
      {selectedFailure && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#f8fafc' }}>Failure Details: {selectedFailure.id.slice(0, 8)}</h3>
              <Badge status="FAILED">{selectedFailure.failure_type}</Badge>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Error Description:</div>
              <div style={{ color: '#fca5a5', background: '#1c1017', padding: '0.75rem', borderRadius: '6px', border: '1px solid #7f1d1d', fontSize: '0.85rem' }}>
                {selectedFailure.error_message}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Relevant Telemetry Snapshot:</div>
              <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                {JSON.stringify(selectedFailure.relevant_metrics, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedFailure(null)}>
                Close
              </button>
              <Link to={`/diagnosis/${selectedFailure.id}`} className="btn btn-primary">
                Trigger AI Diagnosis <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Failures;
