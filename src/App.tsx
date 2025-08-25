import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { HostGame } from './pages/HostGame';
import { PlayerGame } from './pages/PlayerGame';
import { JumbotronDisplay } from './pages/JumbotronDisplay';
import { AdminAnalytics } from './pages/AdminAnalytics';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="font-sans">
          <Routes>
            {/* Protected routes - require authentication */}
            <Route path="/" element={<AuthenticatedApp />} />
            <Route path="/host/:sessionId" element={<HostGame />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            
            {/* Public routes - no authentication required */}
            <Route path="/join/:sessionId" element={<PlayerGame />} />
            <Route path="/display/:sessionId" element={<JumbotronDisplay />} />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;