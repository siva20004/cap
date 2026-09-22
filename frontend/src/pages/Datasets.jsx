import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/Badge';
import { Database, Upload, FileCheck, CheckCircle2 } from 'lucide-react';

export const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = () => {
    api.getDatasets()
      .then((data) => {
        setDatasets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (datasetName) formData.append('name', datasetName);
    formData.append('is_synthetic', false);

    try {
      await api.uploadDataset(formData);
      setUploading(false);
      setFile(null);
      setDatasetName('');
      fetchDatasets();
    } catch (err) {
      alert(`Upload error: ${err.message}`);
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dataset Catalog & Provenance</h1>
          <p className="page-subtitle">Managed datasets with SHA-256 integrity hashes and schema metadata</p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upload Real User CSV Dataset</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-calculates SHA-256 hash & schema on upload</span>
        </div>

        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '220px', margin: 0 }}>
            <label className="form-label">Dataset Display Name</label>
            <input
              type="text"
              placeholder="e.g. custom_orders_2026"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: '220px', margin: 0 }}>
            <label className="form-label">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
            <Upload size={14} /> {uploading ? 'Processing & Hashing...' : 'Upload & Register CSV'}
          </button>
        </form>
      </div>

      {/* Datasets Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Dataset Name</th>
              <th>Type / Origin</th>
              <th>Row Count</th>
              <th>Column Count</th>
              <th>SHA-256 Integrity Hash</th>
              <th>Registered At</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {loading && datasets.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">Loading datasets...</td></tr>
            ) : datasets.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No datasets registered.</td></tr>
            ) : (
              datasets.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{d.name}</td>
                  <td>
                    {d.is_synthetic ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        Synthetic Experimental
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Uploaded User Dataset
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{d.row_count} rows</td>
                  <td>{d.column_count} cols</td>
                  <td><code style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{d.sha256_hash.slice(0, 16)}...</code></td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}><code>{d.file_path}</code></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Datasets;
