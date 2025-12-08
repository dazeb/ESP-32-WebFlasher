import { Firmware } from './types';

export const FIRMWARES: Firmware[] = [
  {
    id: 'marauder',
    name: 'ESP32 Marauder',
    description: 'A suite of WiFi/Bluetooth offensive and defensive tools for the ESP32.',
    version: 'v0.13.7',
    author: 'JustCallMeKoko',
    tags: ['Pentesting', 'WiFi', 'Bluetooth'],
    compatibility: ['ESP32', 'ESP32-S3'],
  },
  {
    id: 'nemo',
    name: 'Nemo',
    description: 'Standalone firmware for ESP32-S3 (M5StickC Plus) with various security testing features.',
    version: 'v1.5.0',
    author: 'n0xa',
    tags: ['M5Stack', 'Pentesting', 'Portable'],
    compatibility: ['ESP32-S3'],
  },
  {
    id: 'meshtastic',
    name: 'Meshtastic',
    description: 'An open source, off-grid, decentralized, mesh networking protocol.',
    version: 'v2.2.19',
    author: 'Meshtastic Project',
    tags: ['Comms', 'LoRa', 'Mesh'],
    compatibility: ['ESP32', 'ESP32-S3', 'ESP32-C3'],
  },
  {
    id: 'evil-portal',
    name: 'Evil Portal',
    description: 'Captive portal implementation for social engineering testing.',
    version: 'v2.0',
    author: 'BigBro',
    tags: ['Phishing', 'WiFi'],
    compatibility: ['ESP32'],
  },
  {
    id: 'flipper-unleashed',
    name: 'Flipper Unleashed',
    description: 'Custom firmware for Flipper Zero with removed regional restrictions and extra features.',
    version: 'v0.74.2',
    author: 'DarkFlippers',
    tags: ['Unrestricted', 'NFC', 'SubGhz'],
    compatibility: ['Flipper Zero'],
  },
  {
    id: 'flipper-xtreme',
    name: 'Xtreme Firmware',
    description: 'High performance firmware for Flipper Zero with extensive protocol support and asset packs.',
    version: 'v42.0',
    author: 'Xtreme Team',
    tags: ['Custom', 'Assets', 'Gaming'],
    compatibility: ['Flipper Zero'],
  }
];

export const TERMINAL_GREETING = `
ESP32 FlashOps v1.0.0
---------------------
Welcome to the advanced web flasher.
Select a device or use the Wizard to begin.
`;