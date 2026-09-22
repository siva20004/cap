import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { RotateCcw, ShieldCheck, CheckCircle2, AlertOctagon, ArrowRight, Play } from 'lucide-react';

export const Recovery = () => {
  const { recoveryId } = useParams();
  const [recoveries, setRecoveries] = useState([]);
  const [activeRecoveryId, setActiveRecoveryId] = useState(recoveryId || '');
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchRecoveries();
  }, []);

  const fetchRecoveries = () => {
    api.getRecoveries().then((data) => {
      setRecoveries(data);
      if (!activeRecoveryId && data.length > 0) {
        setActiveRecoveryId(data[0].id);
      }
    });
  };

  useEffect(() => {
    if (activeRecoveryId) {
      setLoading(true);
      api.getRecovery(activeRecoveryId)
        .then((data) => {
          setRecovery(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [activeRecoveryId]);

  const handleExecute = async () => {
    if (!activeRecoveryId) return;
    setExecuting(true);
    try {
      const rec = await api.executeRecovery({
        schedule_id: recovery.schedule_id,
      });
      setRecovery(rec);
      setExecuting(false);
      fetchRecoveries();
    } catch (err) {
      alert(`Recovery execution failed: ${err.message}`);
      setExecuting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Automated Remediation & Recovery</h1>
          <p className="page-subtitle">Idempotent task re-execution verified against an Independent Calculation Oracle</p>
        </div>
        {recovery && (
          <button className="btn btn-primary" onClick={handleExecute} disabled={executing}>
            <RotateCcw size={14} /> {executing ? 'Executing Tasks...' : 'Execute Recovery Run'}
          </button>
        )}
      </div>

      {/* Select Recovery Session */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Recovery Session:</span>
        <select
          value={activeRecoveryId}
          onChange={(e) => setActiveRecoveryId(e.target.value)}
          style={{ flex: 1, maxWidth: '500px' }}
        >
          {recoveries.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.id.slice(0, 8)}] Status: {r.status} | Oracle: {r.oracle_validation_status} | {new Date(r.created_at).toLocaleTimeString()}
            </option>
          ))}
        </select>
      </div>

      {loading && !recovery ? (
        <div className="empty-state">Loading recovery records...</div>
      ) : !recovery ? (
        <div className="empty-state">No recovery runs found. Please initiate recovery from the scheduler.</div>
      ) : (
        <div>
          {/* Recovery Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Recovery Status</div>
              <div style={{ marginTop: '0.5rem' }}>
                <Badge status={recovery.status} />
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Oracle Validation</div>
              <div style={{ marginTop: '0.5rem' }}>
                <Badge status={recovery.oracle_validation_status} />
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Execution Duration</div>
              <div className="stat-value">{recovery.duration_seconds}s</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Actual Incurred Cost</div>
              <div className="stat-value">${recovery.actual_cost}</div>
            </div>
          </div>

          {/* Independent Oracle Validation Card */}
          <div className="card" style={{ borderColor: recovery.oracle_validation_status === 'PASS' ? '#10b981' : '#ef4444' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color={recovery.oracle_validation_status === 'PASS' ? '#34d399' : '#f87171'} />
                <h3 className="card-title">Independent Mathematical Oracle Verification</h3>
              </div>
              <Badge status={recovery.oracle_validation_status} />
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              The Independent Oracle mathematically computed ground-truth metrics row-by-row on the affected partition slice and verified them against pipeline task outputs.
            </div>

            <pre className="code-block" style={{ fontSize: '0.78rem' }}>
              {JSON.stringify(recovery.oracle_diff_summary, null, 2)}
            </pre>
          </div>

          {/* Task Re-Execution Stepper Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Re-Executed Task Sequence</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Idempotency Key: <code>{recovery.idempotency_key.slice(0, 16)}...</code>
              </span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Task Name</th>
                    <th>Target Partition</th>
                    <th>Execution Status</th>
                    <th>Duration</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {recovery.recovery_task_runs?.map((t, idx) => (
                    <tr key={t.id}>
                      <td>#{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.task_name}</td>
                      <td><code>{t.partition_date || 'All'}</code></td>
                      <td><Badge status={t.status} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{t.duration_seconds}s</td>
                      <td style={{ color: '#f87171' }}>{t.error_message || <span style={{ color: '#64748b' }}>None</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Idempotency & Retry History Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Idempotency & Safe Retry Audit</h3>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Total Re-execution Retries Safely Handled: <strong>{recovery.retry_history?.length ?? 0}</strong>
            </div>
            {recovery.retry_history?.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {recovery.retry_history.map((rh, idx) => (
                  <div key={idx} style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    • [{rh.retried_at}] {rh.note}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recovery;
