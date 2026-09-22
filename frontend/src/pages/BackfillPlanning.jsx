import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { History, Calendar, CheckCircle, ArrowRight, Layers, DollarSign, Clock } from 'lucide-react';

export const BackfillPlanning = () => {
  const { failureId } = useParams();
  const [failures, setFailures] = useState([]);
  const [activeFailureId, setActiveFailureId] = useState(failureId || '');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
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
      fetchPlans();
    }
  }, [activeFailureId]);

  const fetchPlans = () => {
    setLoading(true);
    api.getPlansByFailure(activeFailureId)
      .then((data) => {
        setPlans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleCreatePlan = async (strategy) => {
    if (!activeFailureId) return;
    setGenerating(true);
    try {
      await api.createBackfillPlan({
        failure_id: activeFailureId,
        strategy: strategy,
      });
      setGenerating(false);
      fetchPlans();
    } catch (err) {
      alert(`Backfill plan error: ${err.message}`);
      setGenerating(false);
    }
  };

  const baselinePlan = plans.find((p) => p.strategy === 'baseline_full');
  const proposedPlan = plans.find((p) => p.strategy === 'proposed_selective') || plans[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Partition-Aware Backfill Optimizer</h1>
          <p className="page-subtitle">Selective partition pruning vs Full rerun baseline comparison</p>
        </div>
        {proposedPlan && (
          <Link to={`/scheduling/${proposedPlan.id}`} className="btn btn-primary">
            Configure Cost-Aware Schedule <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Failure Incident Selector */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Target Failure Incident:</span>
        <select
          value={activeFailureId}
          onChange={(e) => setActiveFailureId(e.target.value)}
          style={{ flex: 1, maxWidth: '500px' }}
        >
          {failures.map((f) => (
            <option key={f.id} value={f.id}>
              [{f.id.slice(0, 8)}] {f.pipeline_name} - {f.task_name} ({f.failure_type})
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => handleCreatePlan('proposed_selective')} disabled={generating}>
            {generating ? 'Generating...' : '+ Proposed Plan (Selective)'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleCreatePlan('baseline_full')} disabled={generating}>
            {generating ? 'Generating...' : '+ Baseline Plan (Full Rerun)'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <History size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>No Backfill Plans Generated Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Click "+ Proposed Plan" to analyze the failure metadata and generate a selective backfill plan.
          </p>
          <button className="btn btn-primary" onClick={() => handleCreatePlan('proposed_selective')} disabled={generating}>
            Generate Proposed Selective Plan
          </button>
        </div>
      ) : (
        <div>
          {/* Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Baseline Card */}
            <div className="card" style={{ borderColor: '#334155' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ color: '#94a3b8' }}>Baseline Strategy: Full Pipeline Rerun</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Reruns all historical partitions & all tasks</span>
                </div>
                <Badge status="PENDING">BASELINE</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Duration</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {baselinePlan ? `${baselinePlan.estimated_runtime_seconds}s` : '0.750s (Est)'}
                  </div>
                </div>
                <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {baselinePlan ? `$${baselinePlan.estimated_cost}` : '$0.0035 (Est)'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Partitions to Process: <strong>{baselinePlan ? baselinePlan.total_partitions : 6} Daily Partitions</strong>
              </div>
            </div>

            {/* Proposed Card */}
            <div className="card" style={{ borderColor: '#0284c7' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ color: '#38bdf8' }}>Proposed Strategy: Selective Backfill</h3>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Prunes untainted partitions, reruns only affected tasks</span>
                </div>
                <Badge status="SUCCESS">PROPOSED</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Duration</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
                    {proposedPlan.estimated_runtime_seconds}s
                  </div>
                </div>
                <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
                    ${proposedPlan.estimated_cost}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Selective Partitions: <strong style={{ color: '#38bdf8' }}>{proposedPlan.selective_partitions_count} of {proposedPlan.total_partitions} partitions</strong>
              </div>
            </div>
          </div>

          {/* Affected Partitions Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Affected Partitions & Downstream Tasks Chain</h3>
              <Badge status={proposedPlan.status} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Flagged Date Partitions:</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                {proposedPlan.affected_dates?.map((d, i) => (
                  <span key={i} style={{ background: '#172554', border: '1px solid #1e40af', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: '#93c5fd' }}>
                    📅 {d}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Affected Downstream Tasks:</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', alignItems: 'center' }}>
                {proposedPlan.affected_tasks?.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ color: '#64748b' }}>→</span>}
                    <span style={{ background: '#1e293b', border: '1px solid #334155', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: '#f1f5f9' }}>
                      ⚙️ {t}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackfillPlanning;
