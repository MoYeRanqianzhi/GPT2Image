import { create } from 'zustand';
import type { Config, Conversation, GalleryImage } from '../types';

const CONFIG_KEY = 'gpt2image_config';
const DB_NAME = 'gpt2image';
const DB_VERSION = 1;
const CONV_STORE = 'conversations';
const LEGACY_KEY = 'gpt2image_conversations';

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
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
  if (!db) return;
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
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
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

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface ConfigState {
  config: Config | null;
  loaded: boolean;
  load: () => void;
  save: (config: Config) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loaded: false,
  load: () => {
    const raw = localStorage.getItem(CONFIG_KEY);
    set({ config: raw ? JSON.parse(raw) : null, loaded: true });
  },
  save: (config: Config) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    set({ config });
  },
}));

interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  loadAll: () => Promise<void>;
  get: (id: string) => Promise<Conversation | null>;
  save: (conversation: Conversation) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getAllImages: () => Promise<GalleryImage[]>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  loading: false,
  loadAll: async () => {
    if (!db) return;
    set({ loading: true });
    const tx = db.transaction(CONV_STORE, 'readonly');
    const store = tx.objectStore(CONV_STORE);
    const request = store.getAll();
    const result = await new Promise<Conversation[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.sort((a: Conversation, b: Conversation) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
    set({ conversations: result, loading: false });
  },
  get: async (id: string) => {
    if (!db) return null;
    const tx = db.transaction(CONV_STORE, 'readonly');
    const store = tx.objectStore(CONV_STORE);
    const request = store.get(id);
    return new Promise<Conversation | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },
  save: async (conversation: Conversation) => {
    if (!db) return;
    const tx = db.transaction(CONV_STORE, 'readwrite');
    const store = tx.objectStore(CONV_STORE);
    store.put(conversation);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  remove: async (id: string) => {
    if (!db) return;
    const tx = db.transaction(CONV_STORE, 'readwrite');
    const store = tx.objectStore(CONV_STORE);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  getAllImages: async () => {
    if (!db) return [];
    const tx = db.transaction(CONV_STORE, 'readonly');
    const store = tx.objectStore(CONV_STORE);
    const request = store.getAll();
    const convs = await new Promise<Conversation[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.sort((a: Conversation, b: Conversation) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
    const images: GalleryImage[] = [];
    for (const conv of convs) {
      for (let i = 0; i < conv.messages.length; i++) {
        const msg = conv.messages[i];
        if (msg.role !== 'assistant') continue;

        let prompt = '';
        for (let j = i - 1; j >= 0; j--) {
          if (conv.messages[j].role === 'user') {
            prompt = conv.messages[j].text || '';
            break;
          }
        }

        const variants = msg.variants
          || (msg.variants === undefined && msg.imageBase64
            ? [{ imageBase64: msg.imageBase64, size: msg.size || 'auto', timestamp: msg.timestamp }]
            : []);

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
  },
}));
