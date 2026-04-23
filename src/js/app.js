import { registerRoute, startRouter, getParams } from './router.js';
import { initStore, getConfig } from './store.js';
import { applyTheme } from './theme.js';
import { settingsView } from './views/settings.js';
import { landingView } from './views/landing.js';
import { chatView } from './views/chat.js';
import { galleryView } from './views/gallery.js';
import { historyView } from './views/history.js';
import { waterfallView } from './views/waterfall.js';

async function init() {
  await initStore();
  applyTheme();

  registerRoute('settings', (container) => {
    settingsView(container);
  });

  registerRoute('create', (container) => {
    const params = getParams();
    if (params.conversationId || params.autoSend) {
      chatView(container, params);
    } else {
      landingView(container);
    }
  });

  registerRoute('gallery', (container) => {
    galleryView(container);
  });

  registerRoute('waterfall', (container) => {
    return waterfallView(container);
  });

  registerRoute('history', (container) => {
    historyView(container);
  });

  const app = document.getElementById('app');

  if (!getConfig()) {
    window.location.hash = 'settings';
  }

  startRouter(app);
}

init();
