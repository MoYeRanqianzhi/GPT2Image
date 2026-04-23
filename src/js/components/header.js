import { iconSettings, iconNewChat, iconSun, iconMoon, iconMenu, iconClose } from '../icons.js';
import { navigate } from '../router.js';
import { isDarkMode, toggleDarkMode } from '../theme.js';

export function renderHeader(container, { activeTab = 'create', showNewChat = false } = {}) {
  const header = document.createElement('div');
  header.className = 'header';

  const tabs = [
    { id: 'create', label: 'Create' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'waterfall', label: 'Waterfall' },
    { id: 'history', label: 'History' },
  ];

  const dark = isDarkMode();
  const themeIcon = dark
    ? iconSun().replace('width="24" height="24"', 'width="18" height="18"')
    : iconMoon().replace('width="24" height="24"', 'width="18" height="18"');

  header.innerHTML = `
    <div class="header-logo">
      <img src="assets/icon.png" alt="GPT2IMAGE" class="header-logo-icon">
      <span class="header-logo-text">GPT2IMAGE</span>
    </div>
    <div class="header-actions">
      ${showNewChat ? `<button class="header-btn" data-action="new-chat">${iconNewChat().replace('width="24" height="24"', 'width="16" height="16"')} <span class="header-btn-label">New</span></button>` : ''}
      <div class="header-tabs">
        ${tabs.map(t => `<div class="tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
      </div>
      <button class="header-icon-btn" data-action="menu" title="Menu">
        ${iconMenu().replace('width="24" height="24"', 'width="20" height="20"')}
      </button>
      <button class="header-icon-btn" data-action="toggle-theme" title="${dark ? 'Light mode' : 'Dark mode'}">
        ${themeIcon}
      </button>
      <button class="header-icon-btn" data-action="settings">
        ${iconSettings().replace('width="24" height="24"', 'width="18" height="18"')}
      </button>
    </div>
    <div class="mobile-menu">
      ${tabs.map(t => `<div class="mobile-menu-item${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
    </div>
  `;

  let menuOpen = false;
  const menuBtn = header.querySelector('[data-action="menu"]');
  const mobileMenu = header.querySelector('.mobile-menu');

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    mobileMenu.classList.remove('open');
    menuBtn.innerHTML = iconMenu().replace('width="24" height="24"', 'width="20" height="20"');
  }

  header.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      navigate(tab.dataset.tab);
      closeMenu();
      return;
    }
    const action = e.target.closest('[data-action]');
    if (!action) return;

    if (action.dataset.action === 'settings') { navigate('settings'); closeMenu(); }
    if (action.dataset.action === 'new-chat') { navigate('create'); closeMenu(); }
    if (action.dataset.action === 'menu') {
      e.stopPropagation();
      menuOpen = !menuOpen;
      mobileMenu.classList.toggle('open', menuOpen);
      menuBtn.innerHTML = menuOpen
        ? iconClose().replace('width="24" height="24"', 'width="20" height="20"')
        : iconMenu().replace('width="24" height="24"', 'width="20" height="20"');
    }
    if (action.dataset.action === 'toggle-theme') {
      const nowDark = !isDarkMode();
      const rect = action.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      toggleDarkMode(nowDark, cx, cy);
      action.innerHTML = nowDark
        ? iconSun().replace('width="24" height="24"', 'width="18" height="18"')
        : iconMoon().replace('width="24" height="24"', 'width="18" height="18"');
      action.title = nowDark ? 'Light mode' : 'Dark mode';
    }
  });

  document.addEventListener('click', (e) => {
    if (menuOpen && !header.contains(e.target)) closeMenu();
  });

  container.appendChild(header);
  return header;
}
