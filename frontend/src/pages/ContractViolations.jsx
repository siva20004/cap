import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/Badge';
import { AlertOctagon, ShieldAlert } from 'lucide-react';

export const ContractViolations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViolations();
    const interval = setInterval(fetchViolations, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchViolations = () => {
    api.getContractViolations({ limit: 100 })
      .then((data) => {
        setViolations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contract Violations Log</h1>
          <p className="page-subtitle">Granular rule-level schema and quality violations captured in PostgreSQL</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Rule Type</th>
              <th>Target Column</th>
              <th>Severity</th>
              <th>Invalid Rows</th>
              <th>Violation Details</th>
              <th>Associated Run</th>
            </tr>
          </thead>
          <tbody>
            {loading && violations.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">Loading violations...</td></tr>
            ) : violations.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No contract violations detected. All data adheres to contract specifications.</td></tr>
            ) : (
              violations.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(v.timestamp).toLocaleString()}</td>
                  <td><code>{v.rule_type}</code></td>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>{v.column_name || 'N/A'}</td>
                  <td><Badge status={v.severity} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{v.invalid_rows_count}</td>
                  <td style={{ color: '#fca5a5' }}>{v.violation_details}</td>
                  <td><code>{v.run_id ? v.run_id.slice(0, 8) : 'Direct Validation'}</code></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractViolations;
