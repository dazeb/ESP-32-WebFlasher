
import { Firmware } from './types';

export const FIRMWARES: Firmware[] = [
  {
    id: 'marauder',
    name: 'ESP32 Marauder',
    description: 'A suite of WiFi/Bluetooth offensive and defensive tools. Full multi-bin suite.',
    version: 'v0.13.7',
    author: 'JustCallMeKoko',
    tags: ['Pentesting', 'WiFi'],
    compatibility: ['ESP32', 'ESP32-S3'],
    parts: [
      { url: '/bins/marauder/bootloader.bin', offset: 0x1000, label: 'Bootloader' },
      { url: '/bins/marauder/partitions.bin', offset: 0x8000, label: 'Partitions' },
      { url: '/bins/marauder/boot_app0.bin', offset: 0xe000, label: 'Boot App' },
      { url: '/bins/marauder/marauder.bin', offset: 0x10000, label: 'Application' }
    ]
  },
  {
    id: 'meshtastic',
    name: 'Meshtastic',
    description: 'Open source off-grid mesh networking. Requires full system image.',
    version: 'v2.2.19',
    author: 'Meshtastic Project',
    tags: ['Comms', 'LoRa'],
    compatibility: ['ESP32', 'ESP32-S3', 'ESP32-C3'],
    parts: [
      { url: '/bins/mesh/full.bin', offset: 0x0, label: 'Full Image' }
    ]
  },
  {
    id: 'nemo',
    name: 'Nemo',
    description: 'Security testing features for M5StickC Plus.',
    version: 'v1.5.0',
    author: 'n0xa',
    tags: ['M5Stack', 'Pentesting'],
    compatibility: ['ESP32-S3'],
    parts: [
      { url: '/bins/nemo/nemo.bin', offset: 0x10000, label: 'App' }
    ]
  }
];

export const TERMINAL_GREETING = `
ESP32 FlashOps Professional v2.0
-------------------------------
System Ready. 
1. Select Firmware or upload .bin
2. Connect Device
3. [Optional] Erase Flash
4. Flash Device
`;
