import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LightboxProvider } from './components/Lightbox';
import { useConfigStore, initStore } from './lib/store';
import { useThemeStore } from './lib/theme';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Gallery from './pages/Gallery';
import History from './pages/History';
import Waterfall from './pages/Waterfall';
import Settings from './pages/Settings';

function RequireConfig({ children }: { children: React.ReactNode }) {
  const config = useConfigStore((s) => s.config);
  const loaded = useConfigStore((s) => s.loaded);
  if (!loaded) return null;
  if (!config) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/settings" element={<Settings />} />
      <Route path="/create" element={<RequireConfig><Landing /></RequireConfig>} />
      <Route path="/chat" element={<RequireConfig><Chat /></RequireConfig>} />
      <Route path="/gallery" element={<RequireConfig><Gallery /></RequireConfig>} />
      <Route path="/history" element={<RequireConfig><History /></RequireConfig>} />
      <Route path="/waterfall" element={<RequireConfig><Waterfall /></RequireConfig>} />
      <Route path="/" element={<Navigate to="/create" replace />} />
      <Route path="*" element={<Navigate to="/create" replace />} />
    </Routes>
  );
}

export function App() {
  const loadConfig = useConfigStore((s) => s.load);
  const applyTheme = useThemeStore((s) => s.apply);

  useEffect(() => {
    initStore().then(() => {
      loadConfig();
      applyTheme();
    });
  }, []);

  return (
    <HashRouter>
      <ToastProvider>
        <LightboxProvider>
          <AppRoutes />
        </LightboxProvider>
      </ToastProvider>
    </HashRouter>
  );
}
