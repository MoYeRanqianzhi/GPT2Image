import { getConfig, saveConfig } from './store.js';

export function applyTheme() {
  const config = getConfig();
  const dark = config?.darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export function toggleDarkMode(enabled, originX, originY) {
  const config = getConfig();
  if (config) {
    config.darkMode = enabled;
    saveConfig(config);
  }

  if (originX !== undefined && originY !== undefined) {
    animateThemeFromPoint(enabled, originX, originY);
  } else {
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  }
}

function animateThemeFromPoint(dark, x, y) {
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  const maxRadius = Math.ceil(Math.sqrt(maxX * maxX + maxY * maxY));

  const oldBg = dark ? '#ffffff' : '#1a1a1a';
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:99999;pointer-events:none;background:${oldBg};clip-path:circle(${maxRadius}px at ${x}px ${y}px);`;
  document.body.appendChild(overlay);

  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

  requestAnimationFrame(() => {
    overlay.style.transition = 'clip-path 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  });

  overlay.addEventListener('transitionend', () => {
    overlay.remove();
  }, { once: true });
}

export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
