import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Archive from './pages/Archive';
import ProblemDetail from './pages/ProblemDetail';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';

import { Providers } from './providers/Providers';

function App() {
  return (
    <Providers>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
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
    </Providers>
  );
}

export default App;

