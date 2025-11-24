const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Sensor data
  async getSensors() {
    return this.request('/sensors');
  }

  // System status
  async getStatus() {
    return this.request('/status');
  }

  async getMode() {
    return this.request('/mode');
  }

  async setMode(mode) {
    return this.request('/mode', {
      method: 'POST',
      body: { mode },
    });
  }

  // Pump control
  async startPump(duration) {
    return this.request('/pump/start', {
      method: 'POST',
      body: { duration },
    });
  }

  async stopPump() {
    return this.request('/pump/stop', {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;


