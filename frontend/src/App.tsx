import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Archive from './pages/Archive';
import ProblemDetail from './pages/ProblemDetail';
import Settings from './pages/Settings';
import RevisitJournal from './pages/RevisitJournal';
import LandingPage from './pages/LandingPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstallHint from './components/InstallHint';

import { Providers } from './providers/Providers';

function App() {
  return (
    <Providers>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/journey" element={<RevisitJournal />} />
            <Route path="/problem/:id" element={<ProblemDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </SignedIn>

      <SignedOut>
        <LandingPage />
      </SignedOut>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <InstallHint />
    </Providers>
  );
}

export default App;

