import { renderHeader } from '../components/header.js';
import { getConversations, deleteConversation } from '../store.js';
import { navigate } from '../router.js';
import { iconTrash } from '../icons.js';

export function historyView(container) {
  renderHeader(container, { activeTab: 'history' });

  getConversations().then(conversations => {
    if (!conversations.length) {
      const empty = document.createElement('div');
      empty.className = 'landing fade-in';
      empty.innerHTML = `
        <div style="color:var(--text-muted);font-size:48px;margin-bottom:16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <p style="color:var(--text-tertiary);font-size:15px;">No conversations yet</p>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px;">Start creating to build your history</p>
      `;
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'history-list fade-in';

    for (const conv of conversations) {
      const firstUser = conv.messages.find(m => m.role === 'user');
      if (!firstUser) continue;

      const firstImage = findFirstImage(conv.messages);

      const item = document.createElement('div');
      item.className = 'history-item';

      const thumb = document.createElement('div');
      thumb.className = 'history-thumb';
      if (firstImage) {
        thumb.innerHTML = `<img src="data:image/png;base64,${firstImage}" alt="">`;
      }

      const text = document.createElement('div');
      text.className = 'history-text';

      const prompt = document.createElement('div');
      prompt.className = 'history-prompt';
      prompt.textContent = firstUser.text;

      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = formatTime(conv.createdAt);

      text.appendChild(prompt);
      text.appendChild(time);

      const del = document.createElement('button');
      del.className = 'history-delete';
      del.innerHTML = iconTrash().replace('width="24" height="24"', 'width="16" height="16"');
      del.title = 'Delete conversation';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteConversation(conv.id);
        item.remove();
        if (!list.children.length) navigate('history');
      });

      item.appendChild(thumb);
      item.appendChild(text);
      item.appendChild(del);

      item.addEventListener('click', () => {
        navigate('create', { conversationId: conv.id });
      });

      list.appendChild(item);
    }

    container.appendChild(list);
  });
}

function findFirstImage(messages) {
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    if (msg.imageBase64) return msg.imageBase64;
    if (msg.variants) {
      for (const v of msg.variants) {
        if (v.imageBase64) return v.imageBase64;
      }
    }
  }
  return null;
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
