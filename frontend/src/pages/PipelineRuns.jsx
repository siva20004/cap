import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { Terminal, FileText, AlertTriangle, ArrowRight } from 'lucide-react';

export const PipelineRuns = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchRuns = () => {
    api.getRuns({ limit: 50 })
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline Execution Runs</h1>
          <p className="page-subtitle">Historical records and telemetry logs stored in PostgreSQL</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Status</th>
              <th>Type / Scenario</th>
              <th>Duration</th>
              <th>Rows</th>
              <th>Compute Cost</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && runs.length === 0 ? (
              <tr><td colSpan="8" className="empty-state">Loading runs...</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan="8" className="empty-state">No pipeline runs recorded yet.</td></tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id.slice(0, 8)}...</code></td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    {r.failure_scenario ? (
                      <span style={{ color: '#f87171' }}>{r.failure_scenario}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>{r.run_type}</span>
                    )}
                  </td>
                  <td>{r.duration_seconds}s</td>
                  <td>{r.rows_processed}</td>
                  <td>${r.cost}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRun(r)}>
                        <Terminal size={12} /> Logs
                      </button>
                      {r.status === 'FAILED' && (
                        <Link to="/failures" className="btn btn-danger btn-sm">
                          Triage <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Execution Logs Modal */}
      {selectedRun && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#f8fafc' }}>Run Logs: {selectedRun.id.slice(0, 8)}</h3>
              <Badge status={selectedRun.status} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Tasks Execution Breakdown:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedRun.task_runs?.map((t) => (
                  <div key={t.id} style={{ background: '#090d16', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '0.75rem' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.task_name}: </span>
                    <Badge status={t.status} />
                    <span style={{ color: '#64748b', marginLeft: '0.4rem' }}>{t.duration_seconds}s</span>
                  </div>
                ))}
              </div>
            </div>

            <pre className="code-block" style={{ maxHeight: '350px' }}>
              {selectedRun.execution_logs || 'No execution logs recorded.'}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRun(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineRuns;
