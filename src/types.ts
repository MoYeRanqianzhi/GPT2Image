export interface Config {
  baseURL: string;
  apiKey: string;
  model: string;
  showThinking: boolean;
  thinkingLevel: ThinkingLevel;
  darkMode: boolean;
}

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'xhigh';

export interface Conversation {
  id: string;
  createdAt: number;
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  text?: string;
  imageDataUrl?: string;
  variants?: Variant[];
  activeVariant?: number;
  error?: string;
  timestamp: number;
}

export interface Variant {
  text?: string;
  imageBase64?: string;
  thinking?: string;
  size: string;
  timestamp: number;
}

export interface GalleryImage {
  imageBase64: string;
  size: string;
  prompt: string;
  conversationId: string;
  timestamp: number;
}

export interface StreamDelta {
  text: string | null;
  thinking: string | null;
  imageBase64: string | null;
  done?: boolean;
}

export interface GenerateImageParams {
  prompt: string;
  size?: string;
  action?: string;
  images?: string[];
  thinking?: string;
  onStream?: (delta: StreamDelta) => void;
  history?: Message[];
  signal?: AbortSignal;
}

export interface GenerateImageResult {
  text: string | null;
  imageBase64: string | null;
  thinking: string | null;
  raw: unknown;
}
