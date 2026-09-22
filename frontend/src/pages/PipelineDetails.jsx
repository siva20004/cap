import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import DAGViewer from '../components/DAGViewer';
import { ArrowLeft, Play, Clock, CheckCircle } from 'lucide-react';

export const PipelineDetails = () => {
  const { id } = useParams();
  const [pipeline, setPipeline] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPipeline(id)
      .then((data) => {
        setPipeline(data);
        return api.getRuns({ pipeline_id: id });
      })
      .then((runsData) => {
        setRuns(runsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="page-container"><div className="empty-state">Loading pipeline details...</div></div>;
  if (error) return <div className="page-container"><div className="empty-state" style={{ color: '#ef4444' }}>{error}</div></div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/pipelines" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Back to Pipelines
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{pipeline?.name}</h1>
          <p className="page-subtitle">{pipeline?.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Badge status={pipeline?.status} />
          <Link to="/runs" className="btn btn-secondary btn-sm">
            View All Runs
          </Link>
        </div>
      </div>

      {/* DAG Architecture */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Topological Execution Graph (DAG)</h3>
        </div>
        <div style={{ background: '#090e17', borderRadius: '6px', border: '1px solid #1e293b' }}>
          <DAGViewer tasks={pipeline?.tasks || []} />
        </div>
      </div>

      {/* Registered Tasks Detail */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Registered Tasks Specifications</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Sequence / Name</th>
                <th>Operator Type</th>
                <th>Upstream Dependencies</th>
                <th>Retry Limit</th>
                <th>Timeout Limit</th>
              </tr>
            </thead>
            <tbody>
              {pipeline?.tasks?.map((t, idx) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                    <span style={{ color: '#64748b', marginRight: '0.5rem' }}>{idx + 1}.</span>
                    {t.task_name}
                  </td>
                  <td><code>{t.operator_type}</code></td>
                  <td>{t.upstream_tasks?.length > 0 ? t.upstream_tasks.join(', ') : <span style={{ color: '#64748b' }}>None (Root)</span>}</td>
                  <td>{t.retry_limit} retries</td>
                  <td>{t.timeout_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Runs for this Pipeline */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Execution History</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Status</th>
                <th>Scenario</th>
                <th>Duration</th>
                <th>Rows Processed</th>
                <th>Cost</th>
                <th>Executed At</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id.slice(0, 8)}</code></td>
                  <td><Badge status={r.status} /></td>
                  <td>{r.failure_scenario || <span style={{ color: '#64748b' }}>Standard</span>}</td>
                  <td>{r.duration_seconds}s</td>
                  <td>{r.rows_processed}</td>
                  <td>${r.cost}</td>
                  <td>{new Date(r.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PipelineDetails;
