/**
 * ZEC-5 WebSocket Service
 * Handles communication with the ESP32 controller.
 * Receives JSON sensor data and sends relay toggle commands.
 */

const WS_URL = 'ws://192.168.4.1/ws'; // Default ESP32 AP address

class ZEC5WebSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.relayListeners = new Set();
    this.connected = false;
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
  }

  connect(url = WS_URL) {
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 3000;
        this._notifyStatus();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Expected: { sensors: [v1,v2,v3,v4,v5], relays: [b1..b8] }
          if (data.sensors) {
            this.listeners.forEach(cb => cb(data));
          }
          if (data.relays) {
            this.relayListeners.forEach(cb => cb(data.relays));
          }
        } catch (err) {
          console.warn('[ZEC-5 WS] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._notifyStatus();
        this._scheduleReconnect(url);
      };

      this.ws.onerror = () => {
        this.connected = false;
        this._notifyStatus();
      };
    } catch (err) {
      console.error('[ZEC-5 WS] Connection failed:', err);
      this._scheduleReconnect(url);
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /** Send relay toggle command: { relay: index (0-7), state: true/false } */
  toggleRelay(index, state) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ relay: index, state }));
    }
  }

  onData(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onRelayUpdate(callback) {
    this.relayListeners.add(callback);
    return () => this.relayListeners.delete(callback);
  }

  onStatus(callback) {
    this._statusCallback = callback;
    return () => { this._statusCallback = null; };
  }

  _notifyStatus() {
    if (this._statusCallback) this._statusCallback(this.connected);
  }

  _scheduleReconnect(url) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(url);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }
}

export const wsService = new ZEC5WebSocket();
export default wsService;
