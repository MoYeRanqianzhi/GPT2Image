const CONFIG_KEY = 'gpt2image_config';
const CONVERSATIONS_KEY = 'gpt2image_conversations';

export function getConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getConversations() {
  const raw = localStorage.getItem(CONVERSATIONS_KEY);
  const convs = raw ? JSON.parse(raw) : [];
  return convs.sort((a, b) => b.createdAt - a.createdAt);
}

export function getConversation(id) {
  return getConversations().find(c => c.id === id) || null;
}

export function saveConversation(conversation) {
  const convs = getConversations();
  const idx = convs.findIndex(c => c.id === conversation.id);
  if (idx >= 0) convs[idx] = conversation;
  else convs.push(conversation);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

export function deleteConversation(id) {
  const convs = getConversations().filter(c => c.id !== id);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

export function getAllImages() {
  const images = [];
  for (const conv of getConversations()) {
    for (let i = 0; i < conv.messages.length; i++) {
      const msg = conv.messages[i];
      if (msg.role !== 'assistant') continue;

      let prompt = '';
      for (let j = i - 1; j >= 0; j--) {
        if (conv.messages[j].role === 'user') { prompt = conv.messages[j].text; break; }
      }

      const variants = msg.variants
        || (msg.imageBase64 ? [{ imageBase64: msg.imageBase64, size: msg.size, timestamp: msg.timestamp }] : []);

      for (const v of variants) {
        if (v.imageBase64) {
          images.push({
            imageBase64: v.imageBase64,
            size: v.size || 'auto',
            prompt,
            conversationId: conv.id,
            timestamp: v.timestamp || msg.timestamp,
          });
        }
      }
    }
  }
  return images.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
