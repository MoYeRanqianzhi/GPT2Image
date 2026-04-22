import { registerRoute, startRouter, getParams } from './router.js';
import { getConfig } from './store.js';
import { settingsView } from './views/settings.js';
import { landingView } from './views/landing.js';
import { chatView } from './views/chat.js';
import { galleryView } from './views/gallery.js';
import { historyView } from './views/history.js';

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

registerRoute('history', (container) => {
  historyView(container);
});

const app = document.getElementById('app');

if (!getConfig()) {
  window.location.hash = 'settings';
}

startRouter(app);
