export interface Firmware {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  compatibility: ('ESP32' | 'ESP32-S3' | 'ESP32-C3' | 'Flipper Zero')[];
  file?: File;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'serial';
}

export enum AppTab {
  FLASHER = 'flasher',
  ASSISTANT = 'assistant',
  LOGO_GEN = 'logo_gen',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingUrls?: Array<{uri: string, title: string}>;
  isThinking?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  size: string;
}