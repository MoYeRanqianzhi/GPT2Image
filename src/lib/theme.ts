import { create } from 'zustand';
import { useConfigStore } from './store';

interface ThemeState {
  isDark: boolean;
  apply: () => void;
  toggle: (originX?: number, originY?: number) => void;
}

function readPreferredDark(): boolean {
  const config = useConfigStore.getState().config;
  if (config && typeof config.darkMode === 'boolean') {
    return config.darkMode;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function animateThemeFromPoint(dark: boolean, x: number, y: number) {
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

  const cleanup = () => {
    if (overlay.parentNode) overlay.remove();
  };
  overlay.addEventListener('transitionend', cleanup, { once: true });
  setTimeout(cleanup, 1000);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  apply: () => {
    const dark = readPreferredDark();
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    set({ isDark: dark });
  },
  toggle: (originX?: number, originY?: number) => {
    const next = !get().isDark;
    const configStore = useConfigStore.getState();
    if (configStore.config) {
      configStore.save({ ...configStore.config, darkMode: next });
    }

    if (originX !== undefined && originY !== undefined) {
      animateThemeFromPoint(next, originX, originY);
    } else {
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    }

    set({ isDark: next });
  },
}));
