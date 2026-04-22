import { getConfig, saveConfig } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconGithub } from '../icons.js';

export function settingsView(container) {
  const existing = getConfig();

  const ghLink = document.createElement('a');
  ghLink.href = 'https://github.com/MoYeRanQianZhi/GPT2Image';
  ghLink.target = '_blank';
  ghLink.rel = 'noopener noreferrer';
  ghLink.className = 'settings-github';
  ghLink.innerHTML = iconGithub().replace('width="24" height="24"', 'width="22" height="22"');
  ghLink.title = 'GitHub';
  container.appendChild(ghLink);

  const view = document.createElement('div');
  view.className = 'view-centered fade-in';

  view.innerHTML = `
    <div class="settings-view" style="width:100%;padding:0 20px;">
      <img src="assets/icon.png" alt="GPT2IMAGE" style="width:60px;height:60px;object-fit:contain;margin-bottom:30px;">
      <h2 class="settings-title">Configure GPT2IMAGE</h2>
      <p class="settings-subtitle">Connect to an OpenAI-compatible API endpoint</p>
      <form id="settings-form" style="width:100%;">
        <div class="form-group">
          <label class="form-label" for="base-url">API Base URL</label>
          <input class="form-input" id="base-url" type="url" value="${existing?.baseURL || 'https://api.openai.com/v1'}" placeholder="https://api.openai.com/v1" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="api-key">API Key</label>
          <input class="form-input" id="api-key" type="password" value="${existing?.apiKey || ''}" placeholder="sk-..." required>
        </div>
        <div class="form-group">
          <label class="form-label" for="model">Model</label>
          <input class="form-input" id="model" type="text" value="${existing?.model || 'gpt-5.4'}" placeholder="gpt-5.4">
        </div>
        <button class="btn-primary" type="submit" id="connect-btn">Connect</button>
      </form>
    </div>
  `;

  container.appendChild(view);

  const form = view.querySelector('#settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const baseURL = view.querySelector('#base-url').value.trim();
    const apiKey = view.querySelector('#api-key').value.trim();
    const model = view.querySelector('#model').value.trim() || 'gpt-5.4';

    if (!baseURL || !apiKey) {
      showToast('Please fill in all required fields', { type: 'error' });
      return;
    }

    const btn = view.querySelector('#connect-btn');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
      const resp = await fetch(`${baseURL.replace(/\/+$/, '')}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok && resp.status !== 404) {
        throw new Error(`HTTP ${resp.status}`);
      }
      saveConfig({ baseURL, apiKey, model });
      showToast('Connected successfully');
      navigate('create');
    } catch (err) {
      saveConfig({ baseURL, apiKey, model });
      showToast('Saved (could not verify connection)', { type: 'error' });
      navigate('create');
    }
  });
}
