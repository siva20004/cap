import React from 'react';
import Badge from './Badge';

export const DAGViewer = ({ tasks = [], currentRun = null }) => {
  // Map task status if run is active
  const getTaskStatus = (taskName) => {
    if (!currentRun?.task_runs) return 'PENDING';
    const tr = currentRun.task_runs.find((r) => r.task_name === taskName);
    return tr ? tr.status : 'PENDING';
  };

  return (
    <div style={{ padding: '1rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '700px' }}>
        {tasks.map((task, idx) => {
          const status = getTaskStatus(task.task_name);
          return (
            <React.Fragment key={task.id || task.task_name}>
              {idx > 0 && (
                <div style={{ color: '#475569', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  →
                </div>
              )}
              <div
                style={{
                  background: '#0d131f',
                  border: `1px solid ${status === 'RUNNING' ? '#38bdf8' : status === 'FAILED' ? '#ef4444' : '#222f46'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  minWidth: '150px',
                  boxShadow: status === 'RUNNING' ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {task.operator_type}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  {task.task_name}
                </div>
                <Badge status={status} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default DAGViewer;
