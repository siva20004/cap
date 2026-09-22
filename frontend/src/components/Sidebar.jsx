import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  FileCheck2,
  AlertTriangle,
  Flame,
  BrainCircuit,
  History,
  CalendarClock,
  RotateCcw,
  FlaskConical,
  Cpu,
  Database,
  Terminal
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { section: 'Overview', items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'Orchestration', items: [
      { to: '/pipelines', label: 'Pipelines & DAG', icon: GitBranch },
      { to: '/runs', label: 'Pipeline Runs', icon: PlayCircle },
    ]},
    { section: 'Data Contracts', items: [
      { to: '/contracts', label: 'Schemas & Contracts', icon: FileCheck2 },
      { to: '/violations', label: 'Contract Violations', icon: AlertTriangle },
    ]},
    { section: 'Self-Diagnosis & AI', items: [
      { to: '/failures', label: 'Failures & Triage', icon: Flame },
      { to: '/diagnosis', label: 'AI Diagnosis & Evidence', icon: BrainCircuit },
      { to: '/models', label: 'Model Registry', icon: Cpu },
    ]},
    { section: 'Remediation', items: [
      { to: '/backfill', label: 'Backfill Planning', icon: History },
      { to: '/scheduling', label: 'Cost Scheduler', icon: CalendarClock },
      { to: '/recovery', label: 'Recovery & Oracle', icon: RotateCcw },
    ]},
    { section: 'Research & System', items: [
      { to: '/experiments', label: 'Research Benchmarks', icon: FlaskConical },
      { to: '/datasets', label: 'Dataset Catalog', icon: Database },
      { to: '/logs', label: 'Audit Trail & Logs', icon: Terminal },
    ]},
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">AGY</div>
        <div>
          <div className="brand-title">AI Orchestrator</div>
          <div className="brand-subtitle">Self-Diagnosing Core</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="nav-section-title">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
