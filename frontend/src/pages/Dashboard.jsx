import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { GitBranch, Play, AlertOctagon, CheckCircle2, ShieldAlert, RotateCcw, DollarSign, Clock } from 'lucide-react';

const COLORS = ['#10b981', '#ef4444', '#38bdf8', '#f59e0b', '#a855f7'];

export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
    const timer = setInterval(fetchSummary, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchSummary = () => {
    api.getDashboardSummary()
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  if (loading && !summary) {
    return <div className="page-container"><div className="empty-state">Loading real metrics from PostgreSQL...</div></div>;
  }

  if (error && !summary) {
    return <div className="page-container"><div className="empty-state" style={{ color: '#ef4444' }}>Error: {error}</div></div>;
  }

  const runDistData = Object.entries(summary?.run_status_distribution || {}).map(([name, value]) => ({ name, value }));
  const failureDistData = Object.entries(summary?.failure_type_distribution || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operational Telemetry & Observability</h1>
          <p className="page-subtitle">Real-time pipeline metrics dynamically queried from PostgreSQL</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Pipelines</div>
          <div className="stat-value">{summary?.total_pipelines ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{summary?.total_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: '#34d399' }}>Successful Runs</div>
          <div className="stat-value" style={{ color: '#34d399' }}>{summary?.successful_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: '#f87171' }}>Failed Runs</div>
          <div className="stat-value" style={{ color: '#f87171' }}>{summary?.failed_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: '#facc15' }}>Contract Violations</div>
          <div className="stat-value" style={{ color: '#facc15' }}>{summary?.contract_violations ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: '#38bdf8' }}>Active Recoveries</div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>{summary?.active_recoveries ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Recovery Time</div>
          <div className="stat-value">{summary?.avg_recovery_time_seconds ?? 0}s</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Processing Cost</div>
          <div className="stat-value">${summary?.total_processing_cost ?? 0}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Cost Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Run Processing Cost ($)</h3>
          </div>
          <div style={{ height: '260px' }}>
            {summary?.cost_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.cost_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="run_id" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Area type="monotone" dataKey="cost" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No run data available</div>
            )}
          </div>
        </div>

        {/* Recovery Time Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recovery Duration (Seconds)</h3>
          </div>
          <div style={{ height: '260px' }}>
            {summary?.recovery_time_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.recovery_time_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="recovery_id" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="duration" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No recovery records available</div>
            )}
          </div>
        </div>

        {/* Run Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Run Status Distribution</h3>
          </div>
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {runDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={runDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {runDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No data available</div>
            )}
          </div>
        </div>

        {/* Failure Type Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Failure Scenarios Distribution</h3>
          </div>
          <div style={{ height: '240px' }}>
            {failureDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureDistData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No failures recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
