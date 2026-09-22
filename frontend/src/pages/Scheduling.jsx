import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { CalendarClock, Sliders, CheckCircle2, ArrowRight, Zap, Server } from 'lucide-react';

export const Scheduling = () => {
  const { planId } = useParams();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alphaCost, setAlphaCost] = useState(0.5);
  const [betaTime, setBetaTime] = useState(0.5);
  const [gammaSla, setGammaSla] = useState(0.0);
  const [slaSeconds, setSlaSeconds] = useState(120.0);
  const navigate = useNavigate();

  useEffect(() => {
    if (planId) {
      fetchSchedules();
    }
  }, [planId]);

  const fetchSchedules = () => {
    setLoading(true);
    api.getSchedulesByPlan(planId)
      .then((data) => {
        setSchedules(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleGenerate = async () => {
    if (!planId) return;
    setGenerating(true);
    try {
      const results = await api.generateSchedules({
        plan_id: planId,
        alpha_cost_weight: parseFloat(alphaCost),
        beta_time_weight: parseFloat(betaTime),
        gamma_sla_weight: parseFloat(gammaSla),
        sla_max_seconds: parseFloat(slaSeconds),
      });
      setSchedules(results);
      setGenerating(false);
    } catch (err) {
      alert(`Scheduler calculation error: ${err.message}`);
      setGenerating(false);
    }
  };

  const selectedSchedule = schedules.find((s) => s.is_selected) || schedules[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost-Aware Dynamic Scheduler</h1>
          <p className="page-subtitle">Multi-objective optimization balancing compute cost, duration, and SLA boundaries</p>
        </div>
        {selectedSchedule && (
          <Link to={`/recovery/${selectedSchedule.id}`} className="btn btn-primary">
            Proceed to Automated Recovery <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Multi-Objective Sliders & Controls */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Objective Function Parameters</h3>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            Score = α·Cost + β·Time + γ·SLA_Penalty
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">
              Cost Weight (α): <strong style={{ color: '#38bdf8' }}>{alphaCost}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={alphaCost}
              onChange={(e) => setAlphaCost(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Execution Time Weight (β): <strong style={{ color: '#38bdf8' }}>{betaTime}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={betaTime}
              onChange={(e) => setBetaTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              SLA Penalty Weight (γ): <strong style={{ color: '#38bdf8' }}>{gammaSla}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={gammaSla}
              onChange={(e) => setGammaSla(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">SLA Max Threshold (Seconds)</label>
            <input
              type="number"
              value={slaSeconds}
              onChange={(e) => setSlaSeconds(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !planId}>
          <Sliders size={14} /> {generating ? 'Evaluating Feasible Tiers...' : 'Compute Optimal Schedule Matrix'}
        </button>
      </div>

      {/* Candidate Resource Tiers Matrix */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Candidate Resource Tiers Evaluation</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dynamic mathematical evaluation output</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Resource Tier</th>
                <th>Allocated Hardware</th>
                <th>Rate / Min</th>
                <th>Calculated Duration</th>
                <th>Estimated Cost</th>
                <th>Objective Score</th>
                <th>Feasibility</th>
                <th>Selection Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan="8" className="empty-state">No schedule tiers calculated yet. Click 'Compute Optimal Schedule Matrix'.</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} style={{ background: s.is_selected ? 'rgba(56, 189, 248, 0.06)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, textTransform: 'uppercase', color: s.is_selected ? '#38bdf8' : '#f1f5f9' }}>
                      <Server size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                      {s.resource_tier}
                    </td>
                    <td>{s.allocated_cpu} vCPU | {s.allocated_memory_gb} GB RAM</td>
                    <td>${s.cost_per_minute}/min</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{s.estimated_duration_seconds}s</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>${s.estimated_cost}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.is_selected ? '#34d399' : '#cbd5e1' }}>
                      {s.objective_score}
                    </td>
                    <td><Badge status={s.constraint_status} /></td>
                    <td>
                      {s.is_selected ? (
                        <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={14} /> OPTIMAL
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Alternative</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Scheduling;
