import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
function GithubIcon({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { useConfigStore } from '../lib/store';
import type { Config } from '../types';

export default function Settings() {
  const config = useConfigStore((s) => s.config);

  if (!config) {
    return <ConnectView />;
  }
  return <FullSettings config={config} />;
}

function ConnectView() {
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const saveConfig = useConfigStore((s) => s.save);

  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-5.4');
  const [connecting, setConnecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const b = baseURL.trim();
    const k = apiKey.trim();
    const m = model.trim() || 'gpt-5.4';

    if (!b || !k) {
      showToast('Please fill in all required fields', { type: 'error' });
      return;
    }

    setConnecting(true);
    try {
      const resp = await fetch(`${b.replace(/\/+$/, '')}/models`, {
        headers: { Authorization: `Bearer ${k}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok && resp.status !== 404) {
        throw new Error(`HTTP ${resp.status}`);
      }
      saveConfig({
        baseURL: b,
        apiKey: k,
        model: m,
        showThinking: false,
        thinkingLevel: 'low',
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
      });
      showToast('Connected successfully');
      navigate('/create');
    } catch {
      saveConfig({
        baseURL: b,
        apiKey: k,
        model: m,
        showThinking: false,
        thinkingLevel: 'low',
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
      });
      showToast('Saved (could not verify connection)', { type: 'error' });
      navigate('/create');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <a
        href="https://github.com/MoYeRanQianZhi/GPT2Image"
        target="_blank"
        rel="noopener noreferrer"
        className="settings-github"
        title="GitHub"
      >
        <GithubIcon size={22} />
      </a>
      <div className="view-centered fade-in">
        <div className="settings-view" style={{ width: '100%', padding: '0 20px' }}>
          <img
            src="assets/icon.png"
            alt="GPT2IMAGE"
            style={{
              width: 60,
              height: 60,
              objectFit: 'contain',
              marginBottom: 30,
            }}
          />
          <h2 className="settings-title">Configure GPT2IMAGE</h2>
          <p className="settings-subtitle">
            Connect to an OpenAI-compatible API endpoint
          </p>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="base-url">
                API Base URL
              </label>
              <input
                className="form-input"
                id="base-url"
                type="url"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.openai.com/v1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="api-key">
                API Key
              </label>
              <input
                className="form-input"
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="model">
                Model
              </label>
              <input
                className="form-input"
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-5.4"
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function FullSettings({ config }: { config: Config }) {
  const { show: showToast } = useToast();
  const saveConfig = useConfigStore((s) => s.save);

  const [baseURL, setBaseURL] = useState(config.baseURL || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || 'gpt-5.4');
  const [showThinking, setShowThinking] = useState(!!config.showThinking);

  function handleSave() {
    const b = baseURL.trim();
    const k = apiKey.trim();
    const m = model.trim() || 'gpt-5.4';

    if (!b || !k) {
      showToast('Please fill in all required fields', { type: 'error' });
      return;
    }

    saveConfig({
      baseURL: b,
      apiKey: k,
      model: m,
      showThinking,
      thinkingLevel: config.thinkingLevel || 'low',
      darkMode: config.darkMode ?? false,
    });
    showToast('Settings saved');
  }

  return (
    <>
      <Header activeTab="" />
      <div className="settings-full fade-in">
        <h2 className="settings-full-title">Settings</h2>

        <div className="settings-section">
          <div className="settings-section-title">CONNECTION</div>
          <div className="form-group">
            <label className="form-label" htmlFor="base-url">
              API Base URL
            </label>
            <input
              className="form-input"
              id="base-url"
              type="url"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="api-key">
              API Key
            </label>
            <input
              className="form-input"
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="model">
              Model
            </label>
            <input
              className="form-input"
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-5.4"
            />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">PREFERENCES</div>
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <span className="settings-toggle-name">Show thinking process</span>
              <span className="settings-toggle-desc">
                Display model reasoning in a collapsible block
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showThinking}
                onChange={(e) => setShowThinking(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={handleSave}
        >
          Save
        </button>

        <div className="settings-footer">
          <a
            href="https://github.com/MoYeRanQianZhi/GPT2Image"
            target="_blank"
            rel="noopener noreferrer"
            className="settings-footer-link"
          >
            <GithubIcon size={16} /> <span>GitHub</span>
          </a>
        </div>
      </div>
    </>
  );
}
