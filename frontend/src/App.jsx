import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './pages/AuthPage';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './pages/Dashboard';
import Pipelines from './pages/Pipelines';
import PipelineDetails from './pages/PipelineDetails';
import PipelineRuns from './pages/PipelineRuns';
import DataContracts from './pages/DataContracts';
import ContractViolations from './pages/ContractViolations';
import Failures from './pages/Failures';
import Diagnosis from './pages/Diagnosis';
import BackfillPlanning from './pages/BackfillPlanning';
import Scheduling from './pages/Scheduling';
import Recovery from './pages/Recovery';
import Experiments from './pages/Experiments';
import Models from './pages/Models';
import Datasets from './pages/Datasets';
import SystemLogs from './pages/SystemLogs';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Loading state while verifying token on startup
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <span className="apple-spinner" style={{ width: '36px', height: '36px', borderTopColor: 'var(--accent-blue)' }}></span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Initializing AI Orchestrator...</span>
      </div>
    );
  }

  // First requirement: If user is not authenticated, show login & signup page first!
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Once authenticated, redirect to the main page / orchestrator dashboard
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/pipelines/:id" element={<PipelineDetails />} />
            <Route path="/runs" element={<PipelineRuns />} />
            <Route path="/contracts" element={<DataContracts />} />
            <Route path="/violations" element={<ContractViolations />} />
            <Route path="/failures" element={<Failures />} />
            <Route path="/diagnosis" element={<Diagnosis />} />
            <Route path="/diagnosis/:failureId" element={<Diagnosis />} />
            <Route path="/backfill" element={<BackfillPlanning />} />
            <Route path="/backfill/:failureId" element={<BackfillPlanning />} />
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/scheduling/:planId" element={<Scheduling />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/recovery/:recoveryId" element={<Recovery />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/models" element={<Models />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/logs" element={<SystemLogs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <AuthModal />
      </div>
    </BrowserRouter>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
