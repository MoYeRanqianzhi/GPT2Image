import { getConfig, saveConfig } from '../store.js';
import { renderHeader } from '../components/header.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconGithub } from '../icons.js';

export function settingsView(container) {
  const existing = getConfig();

  if (!existing) {
    renderConnectView(container);
  } else {
    renderFullSettings(container, existing);
  }
}

function renderConnectView(container) {
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
          <input class="form-input" id="base-url" type="url" value="https://api.openai.com/v1" placeholder="https://api.openai.com/v1" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="api-key">API Key</label>
          <input class="form-input" id="api-key" type="password" value="" placeholder="sk-..." required>
        </div>
        <div class="form-group">
          <label class="form-label" for="model">Model</label>
          <input class="form-input" id="model" type="text" value="gpt-5.4" placeholder="gpt-5.4">
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
      saveConfig({ baseURL, apiKey, model, showThinking: false, thinkingLevel: 'low' });
      showToast('Connected successfully');
      navigate('create');
    } catch (err) {
      saveConfig({ baseURL, apiKey, model, showThinking: false, thinkingLevel: 'low' });
      showToast('Saved (could not verify connection)', { type: 'error' });
      navigate('create');
    }
  });
}

function renderFullSettings(container, config) {
  renderHeader(container, { activeTab: null });

  const wrapper = document.createElement('div');
  wrapper.className = 'settings-full fade-in';

  const title = document.createElement('h2');
  title.className = 'settings-full-title';
  title.textContent = 'Settings';
  wrapper.appendChild(title);

  // --- Connection Section ---
  const connSection = document.createElement('div');
  connSection.className = 'settings-section';

  const connTitle = document.createElement('div');
  connTitle.className = 'settings-section-title';
  connTitle.textContent = 'CONNECTION';
  connSection.appendChild(connTitle);

  connSection.innerHTML += `
    <div class="form-group">
      <label class="form-label" for="base-url">API Base URL</label>
      <input class="form-input" id="base-url" type="url" value="${config.baseURL || ''}" placeholder="https://api.openai.com/v1" required>
    </div>
    <div class="form-group">
      <label class="form-label" for="api-key">API Key</label>
      <input class="form-input" id="api-key" type="password" value="${config.apiKey || ''}" placeholder="sk-..." required>
    </div>
    <div class="form-group">
      <label class="form-label" for="model">Model</label>
      <input class="form-input" id="model" type="text" value="${config.model || 'gpt-5.4'}" placeholder="gpt-5.4">
    </div>
  `;

  wrapper.appendChild(connSection);

  // --- Preferences Section ---
  const prefSection = document.createElement('div');
  prefSection.className = 'settings-section';

  const prefTitle = document.createElement('div');
  prefTitle.className = 'settings-section-title';
  prefTitle.textContent = 'PREFERENCES';
  prefSection.appendChild(prefTitle);

  const thinkingRow = document.createElement('div');
  thinkingRow.className = 'settings-toggle-row';

  const thinkingLabel = document.createElement('div');
  thinkingLabel.className = 'settings-toggle-info';
  thinkingLabel.innerHTML = `
    <span class="settings-toggle-name">Show thinking process</span>
    <span class="settings-toggle-desc">Display model reasoning in a collapsible block</span>
  `;

  const toggleWrap = document.createElement('label');
  toggleWrap.className = 'toggle-switch';
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = !!config.showThinking;
  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'toggle-slider';
  toggleWrap.appendChild(toggleInput);
  toggleWrap.appendChild(toggleSlider);

  thinkingRow.appendChild(thinkingLabel);
  thinkingRow.appendChild(toggleWrap);
  prefSection.appendChild(thinkingRow);

  wrapper.appendChild(prefSection);

  // --- Save Button ---
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.style.marginTop = '12px';
  saveBtn.addEventListener('click', async () => {
    const baseURL = wrapper.querySelector('#base-url').value.trim();
    const apiKey = wrapper.querySelector('#api-key').value.trim();
    const model = wrapper.querySelector('#model').value.trim() || 'gpt-5.4';
    const showThinking = toggleInput.checked;

    if (!baseURL || !apiKey) {
      showToast('Please fill in all required fields', { type: 'error' });
      return;
    }

    saveConfig({ baseURL, apiKey, model, showThinking, thinkingLevel: config.thinkingLevel || 'low' });
    showToast('Settings saved');
  });
  wrapper.appendChild(saveBtn);

  // --- GitHub Link ---
  const ghRow = document.createElement('div');
  ghRow.className = 'settings-footer';
  ghRow.innerHTML = `<a href="https://github.com/MoYeRanQianZhi/GPT2Image" target="_blank" rel="noopener noreferrer" class="settings-footer-link">${iconGithub().replace('width="24" height="24"', 'width="16" height="16"')} <span>GitHub</span></a>`;
  wrapper.appendChild(ghRow);

  container.appendChild(wrapper);
}
