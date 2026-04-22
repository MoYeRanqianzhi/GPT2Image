const CONFIG_KEY = 'gpt2image_config';
const DB_NAME = 'gpt2image';
const DB_VERSION = 1;
const CONV_STORE = 'conversations';
const LEGACY_KEY = 'gpt2image_conversations';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(CONV_STORE)) {
        database.createObjectStore(CONV_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

async function migrateFromLocalStorage() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const convs = JSON.parse(raw);
    if (!Array.isArray(convs) || convs.length === 0) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    const tx = db.transaction(CONV_STORE, 'readwrite');
    const store = tx.objectStore(CONV_STORE);
    for (const conv of convs) {
      store.put(conv);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    localStorage.removeItem(LEGACY_KEY);
  } catch (e) {
    console.warn('Migration from localStorage failed:', e);
  }
}

export async function initStore() {
  await openDB();
  await migrateFromLocalStorage();
}

export function getConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getConversations() {
  const tx = db.transaction(CONV_STORE, 'readonly');
  const store = tx.objectStore(CONV_STORE);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

export async function getConversation(id) {
  const tx = db.transaction(CONV_STORE, 'readonly');
  const store = tx.objectStore(CONV_STORE);
  const request = store.get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveConversation(conversation) {
  const tx = db.transaction(CONV_STORE, 'readwrite');
  const store = tx.objectStore(CONV_STORE);
  store.put(conversation);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteConversation(id) {
  const tx = db.transaction(CONV_STORE, 'readwrite');
  const store = tx.objectStore(CONV_STORE);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllImages() {
  const convs = await getConversations();
  const images = [];
  for (const conv of convs) {
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
