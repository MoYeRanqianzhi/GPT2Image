import { getConfig, saveConfig } from './store.js';

export function applyTheme() {
  const config = getConfig();
  const dark = config?.darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function setThemeImmediate(theme) {
  document.documentElement.classList.add('no-transition');
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.offsetHeight;
  document.documentElement.classList.remove('no-transition');
}

export function toggleDarkMode(enabled) {
  const config = getConfig();
  if (config) {
    config.darkMode = enabled;
    saveConfig(config);
  }
  setThemeImmediate(enabled ? 'dark' : 'light');
}

export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
