import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/Badge';
import { Cpu, RefreshCw, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Models = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = () => {
    api.getModels()
      .then((data) => {
        setModels(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleRetrain = async () => {
    setTraining(true);
    try {
      await api.triggerModelTraining({
        model_type: 'ALL',
        random_seed: 42,
        epochs: 15,
      });
      setTraining(false);
      fetchModels();
    } catch (err) {
      alert(`Model training error: ${err.message}`);
      setTraining(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI & ML Model Registry</h1>
          <p className="page-subtitle">Trained neural networks and classifiers persisted in PostgreSQL model catalog</p>
        </div>
        <button className="btn btn-primary" onClick={handleRetrain} disabled={training}>
          <RefreshCw size={14} /> {training ? 'Training Models (PyTorch & Scikit)...' : 'Retrain All Models'}
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Loading model registry...</div>
      ) : models.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Cpu size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>Model not trained</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            No trained model weights found in registry. Trigger a real training run below.
          </p>
          <button className="btn btn-primary" onClick={handleRetrain} disabled={training}>
            Train Models Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {models.map((m) => (
            <div key={m.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.15rem' }}>{m.model_name}</h3>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                    Type: <strong>{m.model_type}</strong> | Version: <strong>v{m.version}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge status={m.status} />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Trained: {new Date(m.trained_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Evaluation Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {Object.entries(m.evaluation_metrics || {}).map(([metricKey, val]) => {
                  if (typeof val === 'object') return null;
                  return (
                    <div key={metricKey} style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                        {metricKey.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.25rem' }}>
                        {typeof val === 'number' && val <= 1.0 ? `${(val * 100).toFixed(2)}%` : val}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Features List */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Model Input Features ({m.features_list?.length ?? 0}):
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {m.features_list?.map((fName, idx) => (
                    <span key={idx} style={{ background: '#1e293b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                      <code>{fName}</code>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Weights Path: <code>{m.file_path}</code> | Training Source: <code>{m.training_dataset}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Models;
