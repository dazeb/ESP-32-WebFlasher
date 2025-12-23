
export type Section = 
  | 'device-info' 
  | 'partitions' 
  | 'nvs' 
  | 'apps' 
  | 'spiffs' 
  | 'littlefs' 
  | 'fatfs' 
  | 'flash-tools' 
  | 'serial-monitor' 
  | 'assistant' 
  | 'logo-gen'
  | 'about';

export interface Partition {
  label: string;
  type: number;
  subtype: number;
  offset: number;
  size: number;
  flags: number;
  readableSize: string;
  readableOffset: string;
  typeLabel: string;
}

export interface NVSItem {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface FirmwarePart {
  url: string;
  offset: number;
  label?: string;
}

export interface Firmware {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  compatibility: ('ESP32' | 'ESP32-S3' | 'ESP32-C3' | 'Flipper Zero')[];
  parts?: FirmwarePart[];
  file?: File;
  customOffset?: number;
}

export interface ChipInfo {
  chipName: string;
  mac: string;
  flashSize: string;
  revision: string;
  features: string[];
  crystalFreq: string;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'serial' | 'system';
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
