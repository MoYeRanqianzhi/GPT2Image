import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useConfigStore } from './lib/store';

function AppPlaceholder() {
  return <div style={{ padding: 40, textAlign: 'center' }}>GPT2IMAGE — React scaffolding ready</div>;
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppPlaceholder />} />
      </Routes>
    </HashRouter>
  );
}
