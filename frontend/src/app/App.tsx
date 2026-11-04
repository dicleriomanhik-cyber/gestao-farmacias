import { useEffect } from 'react';
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";
import "../styles/responsive.css";
import AppRouter from './router';
import { startSyncEngine } from '../offline/sync';

export default function App() {
  useEffect(() => {
    startSyncEngine();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}

