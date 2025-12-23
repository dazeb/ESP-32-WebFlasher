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
    try {
      return await navigator.serial.getPorts();
    } catch (e) {
      console.warn('Failed to get authorized ports (likely permissions policy):', e);
      return [];
    }
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
        // Attempt to "detect" by trying a range of common rates.
        // Prioritized by likelihood for modern ESP32/Embedded work vs legacy.
        const candidates = [115200, 921600, 57600, 38400, 19200, 9600, 4800];
        
        for (const rate of candidates) {
            try {
                // Ensure port is closed before trying to open (in case of retry loop issues)
                if (this.port.readable) {
                    await this.port.close();
                }

                await this.port.open({ baudRate: rate });
                // If successful, return this rate
                return rate;
            } catch (e) {
                 console.warn(`Auto-detect at ${rate} failed.`, e);
                 // The port might be in an inconsistent state or just failed to open.
                 // Continue to next candidate.
            }
        }
        console.warn('All auto-detect candidates failed, attempting fallback to selected rate.');
      }

      // Fallback (or default choice if autoDetect is false)
      // Ensure port is closed before trying fallback
      if (this.port.readable) {
          await this.port.close();
      }
      
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