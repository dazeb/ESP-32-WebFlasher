// Simple wrapper for Web Serial API interactions
// Note: Actual binary flashing requires a complex state machine (like esptool-js).
// We will implement the CONNECTION and SERIAL MONITOR aspects, and simulate the flashing progress.

export interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream | null;
  writable: WritableStream | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

export class SerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private keepReading = false;

  public async getPorts(): Promise<SerialPort[]> {
    if (!('serial' in navigator)) {
      return [];
    }
    return await navigator.serial.getPorts();
  }

  public getPort(): SerialPort | null {
    return this.port;
  }

  public async connect(baudRate: number = 115200, autoDetect: boolean = false, port?: SerialPort): Promise<number | null> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser.');
    }

    try {
      this.port = port || await navigator.serial.requestPort();
      
      if (autoDetect) {
        // Attempt to "detect" by trying the standard ESP32 boot rate first.
        try {
            await this.port.open({ baudRate: 115200 });
            return 115200;
        } catch (e) {
            console.warn('Auto-detect at 115200 failed, attempting fallback.', e);
            // Ensure port is fully closed before retrying if needed
            if (this.port.readable) await this.port.close();
        }
      }

      // Fallback (or default choice if autoDetect is false)
      await this.port.open({ baudRate });
      return baudRate;
    } catch (err) {
      console.error('Error connecting to serial port:', err);
      return null;
    }
  }

  public async disconnect(keepPortReference: boolean = false) {
    this.keepReading = false;
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      if (!keepPortReference) {
        this.port = null;
      }
    }
  }

  public isConnected(): boolean {
    return !!this.port && !!this.port.readable;
  }

  public async write(data: string) {
    if (!this.port || !this.port.writable) return;
    const writer = this.port.writable.getWriter();
    await writer.write(this.encoder.encode(data));
    writer.releaseLock();
  }

  public async startReading(onData: (data: string) => void) {
    if (!this.port || !this.port.readable) return;
    this.keepReading = true;
    
    // Create a reader
    this.reader = this.port.readable.getReader();

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break; // Reader has been canceled
        }
        if (value) {
          onData(this.decoder.decode(value));
        }
      }
    } catch (error) {
      console.error('Serial read error:', error);
    } finally {
      this.reader.releaseLock();
    }
  }
}

declare global {
  interface Navigator {
    serial: {
      requestPort(options?: { filters: any[] }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ): void;
      removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions
      ): void;
    };
  }
}