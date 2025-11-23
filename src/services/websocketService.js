import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {
      sensor_update: [],
      status_update: [],
      mode_update: [],
      connect: [],
      disconnect: []
    };
  }

  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log(`Connecting to WebSocket server: ${BACKEND_URL}`);
    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id);
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    // Listen for sensor updates
    this.socket.on('sensor_update', (data) => {
      this.emit('sensor_update', data);
    });

    // Listen for status updates
    this.socket.on('status_update', (data) => {
      this.emit('status_update', data);
    });

    // Listen for mode updates
    this.socket.on('mode_update', (data) => {
      this.emit('mode_update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  requestSensors() {
    if (this.socket?.connected) {
      this.socket.emit('get_sensors');
    }
  }

  requestStatus() {
    if (this.socket?.connected) {
      this.socket.emit('get_status');
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;

