import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/Badge';
import { Terminal, Shield, Filter } from 'lucide-react';

export const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = () => {
    api.getAuditLogs(100)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const filteredLogs = filterAction
    ? logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()))
    : logs;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit Trail & Event Logs</h1>
          <p className="page-subtitle">Immutable chronological audit log of all system actions, state transitions, and results</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Filter size={14} color="#94a3b8" />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Filter by Action:</span>
        <input
          type="text"
          placeholder="e.g. PIPELINE, RECOVERY, MODEL..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Showing {filteredLogs.length} of {logs.length} logged events
        </span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action / Event</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Result Status</th>
              <th>Event Details (JSON Payload)</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">Loading audit logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No matching audit logs found.</td></tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    <code>{l.action}</code>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: l.user_or_system === 'SYSTEM' ? '#38bdf8' : '#34d399' }}>
                      {l.user_or_system}
                    </span>
                  </td>
                  <td><span style={{ color: '#cbd5e1' }}>{l.resource}</span></td>
                  <td><Badge status={l.result} /></td>
                  <td style={{ fontSize: '0.75rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <code style={{ color: '#94a3b8' }}>{JSON.stringify(l.details)}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogs;
