# ⚡ ESP32 FlashOps

![Version](https://img.shields.io/badge/version-1.0.0-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tech](https://img.shields.io/badge/built%20with-React%20%7C%20Web%20Serial%20%7C%20esptool.js-slate)

**ESP32 FlashOps** is a professional, web-based firmware flashing tool designed for security researchers, hobbyists, and makers. It leverages the **Web Serial API** to communicate directly with ESP32 microcontrollers (and Flipper Zero devices) from your browser, eliminating the need for command-line tools or complex Python environments.

---

## ✨ Features

*   **🔌 Web Serial Integration**: Connect to devices directly via Chrome, Edge, or Opera without installing native software.
*   **🔥 Real Firmware Flashing**: Powered by `esptool-js` for actual binary transfer to ESP32 ROM bootloaders.
*   **🧙‍♂️ Setup Wizard**: An intuitive step-by-step wizard to find the right firmware for your specific hardware (ESP32, S3, C3, Flipper).
*   **📂 Custom Uploads**: Flash your own compiled `.bin` files easily.
*   **🖥️ Integrated Serial Monitor**: Real-time baud-rate adjustable terminal to view boot logs and debugging info.
*   **⚡ Baud Rate Auto-Detect**: Automatically negotiates the best connection speed or falls back to safe defaults.
*   **📚 Curated Repository**: Built-in access to popular security firmwares like *Marauder*, *Meshtastic*, and *Nemo*.

---

## 🛠️ How It Works

The application runs entirely in the client's browser. It uses the browser's access to the USB/Serial ports to handshake with the ESP32's ROM bootloader.

```mermaid
graph TD
    User[👤 User] -->|1. Select Device/FW| UI[💻 FlashOps UI]
    User -->|2. Connect USB| USB[🔌 USB Controller]
    
    subgraph Browser Context
        UI -->|Request Port| WebSerial[Web Serial API]
        UI -->|Load Binary| ESPTool[esptool-js Logic]
    end
    
    WebSerial <-->|Permission Grant| BrowserPrompt[Browser Picker]
    BrowserPrompt -.->|Authorized| USB
    
    USB <-->|Serial Data (TX/RX)| Bootloader[🤖 ESP32 ROM Bootloader]
    
    ESPTool -->|Slip Encoded Packets| WebSerial
    Bootloader -->|Acks/Logs| WebSerial
    WebSerial -->|Update UI| UI
```

---

## 🚀 Getting Started

### Prerequisites

1.  **Browser**: You must use a Chromium-based browser (Chrome, Edge, Opera, Brave) that supports the Web Serial API. *Firefox and Safari are not currently supported.*
2.  **Drivers**: Ensure you have the correct USB-to-UART drivers installed for your device:
    *   [CP210x Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) (Common on DevKits)
    *   [CH340 Drivers](https://learn.sparkfun.com/tutorials/how-to-install-ch340-drivers/all) (Common on cheaper clones)

### Installation

No installation required! This is a web app. However, to run it locally:

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

---

## 📖 Usage Guide

### 1. Select Firmware
You have three options:
*   **Wizard**: Click the **"Wizard"** button for a guided selection based on your device model.
*   **List**: Choose a pre-configured firmware (e.g., Marauder) from the sidebar.
*   **Upload**: Click **"Upload"** to select a custom `.bin` file from your computer.

### 2. Connect Device
1.  Plug your ESP32 into a USB port.
2.  (Optional) Select a specific **Baud Rate** or leave **Auto-Detect** checked.
3.  Click **"Connect"**.
4.  A browser popup will appear. Select your device (often listed as "USB Serial" or "CP2102") and click **Connect**.

### 3. Flash Firmware
1.  Once connected, the status will turn green.
2.  Click the blue **"FLASH FIRMWARE"** button.
3.  **Important**: If the connection fails immediately, you may need to hold the **BOOT** button on your ESP32 while clicking Flash to enter download mode manually.
4.  Watch the progress bar and terminal logs.

### 4. Monitor
After flashing, the device usually resets. You can view the boot output in the **Serial Monitor** at the bottom of the screen.

---

## 🧩 Supported Devices & Firmware

| Device Family | Compatibility | Example Firmware |
| :--- | :--- | :--- |
| **ESP32 (Original)** | ✅ Full Support | Marauder, Evil Portal, Meshtastic |
| **ESP32-S3** | ✅ Full Support | Nemo, Marauder (S3 Version) |
| **ESP32-C3** | ✅ Partial Support | Meshtastic |
| **Flipper Zero** | ⚠️ Experimental | Unleashed, Xtreme (via UART bridge) |

---

## 🔧 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Web Serial API not supported"** | Switch to Google Chrome or Microsoft Edge. |
| **Device not showing in picker** | Check your USB cable (some are power-only). Install CP210x/CH340 drivers. |
| **"Failed to connect to Packet Header"** | Hold the **BOOT** button on your ESP32 board, press **EN/RST**, release **EN**, then release **BOOT** to force Bootloader mode. |
| **Upload stops at 99%** | Wait a moment; the tool is verifying the hash and resetting the board. |

---

## ⚖️ Disclaimer

**FlashOps** is a tool intended for educational purposes and authorized security testing/development. The authors are not responsible for bricked devices or misuse of the firmware provided in the repository. Always backup your existing firmware before flashing.
