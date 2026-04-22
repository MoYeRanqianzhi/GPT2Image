import { getConfig, saveConfig } from './store.js';

export function applyTheme() {
  const config = getConfig();
  const dark = config?.darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export function toggleDarkMode(enabled) {
  const config = getConfig();
  if (config) {
    config.darkMode = enabled;
    saveConfig(config);
  }
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  root.setAttribute('data-theme', enabled ? 'dark' : 'light');
  setTimeout(() => root.classList.remove('theme-transitioning'), 450);
}

export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
