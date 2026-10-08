import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Header from './components/Header';
import FeedPage from './pages/FeedPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) {
    return <p className="center muted">Loading…</p>;
  }

  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<RequireAuth><FeedPage /></RequireAuth>} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
