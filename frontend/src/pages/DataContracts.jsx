import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import { FileCode, CheckCircle, AlertTriangle, ArrowRight, Upload } from 'lucide-react';

export const DataContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [valResult, setValResult] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = () => {
    api.getContracts()
      .then((data) => {
        setContracts(data);
        if (data.length > 0 && !selectedContract) {
          setSelectedContract(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleValidate = async () => {
    if (!selectedContract) return;
    setValidating(true);
    setValResult(null);

    try {
      const result = await api.validateDatasetContract({
        dataset_file: 'data/raw/orders.csv',
        contract_table: selectedContract.table_name,
        version: selectedContract.active_version,
      });
      setValResult(result);
      setValidating(false);
    } catch (err) {
      alert(`Validation error: ${err.message}`);
      setValidating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Versioned Data Contracts</h1>
          <p className="page-subtitle">Declarative schema rules and validation boundaries persisted in PostgreSQL</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handleValidate} disabled={validating}>
            <CheckCircle size={14} /> {validating ? 'Inspecting Data...' : 'Validate orders.csv'}
          </button>
          <Link to="/violations" className="btn btn-secondary">
            View All Violations <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {valResult && (
        <div className="card" style={{ borderColor: valResult.is_valid ? '#10b981' : '#ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, color: valResult.is_valid ? '#34d399' : '#f87171' }}>
                Validation Outcome: {valResult.is_valid ? 'PASSED (0 CRITICAL VIOLATIONS)' : 'FAILED'}
              </span>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Contract Version: v{valResult.contract_version} | Total Violations Found: {valResult.total_violations}
              </div>
            </div>
            <Badge status={valResult.is_valid ? 'PASS' : 'FAIL'} />
          </div>
          {valResult.violations?.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {valResult.violations.map((v, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.25rem' }}>
                  • [{v.rule_type}] {v.violation_details}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contracts Viewer */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Left selector */}
        <div className="card" style={{ padding: '0.75rem' }}>
          <div className="card-header" style={{ margin: 0, paddingBottom: '0.5rem' }}>
            <h4 className="card-title" style={{ fontSize: '0.85rem' }}>Registered Contracts</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {contracts.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedContract(c); setValResult(null); }}
                style={{
                  textAlign: 'left',
                  background: selectedContract?.id === c.id ? '#1e293b' : '#0e1524',
                  border: `1px solid ${selectedContract?.id === c.id ? '#38bdf8' : '#222f46'}`,
                  borderRadius: '6px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  color: 'inherit'
                }}
              >
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.table_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                  Active Version: v{c.active_version}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right details */}
        {selectedContract && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Table: {selectedContract.table_name}</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{selectedContract.description}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedContract.versions?.map((v) => (
                  <span key={v.id} style={{ fontSize: '0.75rem', background: '#090d16', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #1e293b', color: '#38bdf8' }}>
                    v{v.version_str} ({v.sha256_hash.slice(0, 8)})
                  </span>
                ))}
              </div>
            </div>

            {/* Version Schema Definition */}
            {selectedContract.versions?.map((v) => (
              <div key={v.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                  Contract Definition v{v.version_str} (SHA-256: <code>{v.sha256_hash}</code>)
                </div>
                <pre className="code-block" style={{ maxHeight: '400px' }}>
                  {JSON.stringify(v.schema_definition, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataContracts;
