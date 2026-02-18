
import { useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Archive from './pages/Archive';
import ProblemDetail from './pages/ProblemDetail';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProblemAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <SignedIn>
        <Layout onProblemAdded={handleProblemAdded}>
          <Routes>
            <Route path="/" element={<Dashboard refreshKey={refreshKey} />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/problem/:id" element={<ProblemDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </SignedIn>

      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}

export default App;

