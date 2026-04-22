import { iconSettings, iconNewChat } from '../icons.js';
import { navigate } from '../router.js';

export function renderHeader(container, { activeTab = 'create', showNewChat = false } = {}) {
  const header = document.createElement('div');
  header.className = 'header';

  const tabs = [
    { id: 'create', label: 'Create' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'history', label: 'History' },
  ];

  header.innerHTML = `
    <div class="header-logo">
      <img src="assets/icon.png" alt="GPT2IMAGE" class="header-logo-icon">
      <span style="font-family:var(--font-serif);font-size:15px;font-weight:600;color:var(--text-primary);letter-spacing:0.02em">GPT2IMAGE</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      ${showNewChat ? `<button class="tab" data-action="new-chat" style="display:flex;align-items:center;gap:4px;color:var(--text-secondary);background:none;border:1px solid var(--border);border-radius:10px;padding:5px 12px">${iconNewChat().replace('width="24" height="24"', 'width="16" height="16"')} New</button>` : ''}
      <div class="header-tabs">
        ${tabs.map(t => `<div class="tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
      </div>
      <button class="tab" data-action="settings" style="color:var(--text-muted);background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;">
        ${iconSettings().replace('width="24" height="24"', 'width="18" height="18"')}
      </button>
    </div>
  `;

  header.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      navigate(tab.dataset.tab);
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action?.dataset.action === 'settings') navigate('settings');
    if (action?.dataset.action === 'new-chat') navigate('create');
  });

  container.appendChild(header);
  return header;
}
