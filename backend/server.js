import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { mqttConfig } from './config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// MQTT client
let mqttClient = null;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for sensor data (will be updated via MQTT)
let sensorData = {
  temp: 24,
  hum: 66,
  soil: 60,
  level: 56,
  flow: 0,
  timestamp: Date.now()
};

// System state
let systemState = {
  pumpOn: false,
  mode: 'automatic', // 'automatic' or 'manual'
  pumpStartTime: null,
  pumpDuration: 0, // in milliseconds
  lastCommand: null,
  lastCommandTime: null
};

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Watering Backend is running' });
});

// Get current sensor data
app.get('/api/sensors', (req, res) => {
  res.json(sensorData);
});

// Get system status (pump state, mode, ...)
app.get('/api/status', (req, res) => {
  res.json({
    pumpOn: systemState.pumpOn,
    mode: systemState.mode,
    pumpStartTime: systemState.pumpStartTime,
    pumpDuration: systemState.pumpDuration,
    remainingTime: systemState.pumpOn && systemState.pumpStartTime
      ? Math.max(0, systemState.pumpDuration - (Date.now() - systemState.pumpStartTime))
      : 0,
    lastCommand: systemState.lastCommand,
    lastCommandTime: systemState.lastCommandTime
  });
});

// Get current mode
app.get('/api/mode', (req, res) => {
  res.json({ mode: systemState.mode });
});

// Set mode (automatic or manual)
app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  
  if (!mode || !['automatic', 'manual'].includes(mode)) {
    return res.status(400).json({ 
      error: 'Invalid mode. Must be "automatic" or "manual"' 
    });
  }
  
  systemState.mode = mode;
  console.log(`Mode changed to: ${mode}`);
  
  res.json({ 
    success: true, 
    mode: systemState.mode,
    message: `Mode set to ${mode}` 
  });
});

// Start pump
app.post('/api/pump/start', (req, res) => {
  const { duration } = req.body; // duration in seconds 
  
  if (systemState.pumpOn) {
    return res.status(400).json({ 
      error: 'Pump is already running',
      currentState: systemState 
    });
  }
  
  // Default duration
  const durationMs = (duration || 10) * 1000; // 10 seconds default
  
  systemState.pumpOn = true;
  systemState.pumpStartTime = Date.now();
  systemState.pumpDuration = durationMs;
  systemState.lastCommand = 'start';
  systemState.lastCommandTime = Date.now();
  
  console.log(`Pump started. Duration: ${durationMs}ms`);
  
  res.json({ 
    success: true, 
    message: 'Pump started',
    duration: durationMs,
    mode: systemState.mode
  });
  
  // Auto-stop after duration )
  if (systemState.mode === 'automatic') {
    setTimeout(() => {
      if (systemState.pumpOn) {
        systemState.pumpOn = false;
        systemState.pumpStartTime = null;
        systemState.pumpDuration = 0;
        systemState.lastCommand = 'auto_stop';
        systemState.lastCommandTime = Date.now();
        console.log('Pump auto-stopped after duration');
      }
    }, durationMs);
  }
});

// Stop pump
app.post('/api/pump/stop', (req, res) => {
  if (!systemState.pumpOn) {
    return res.status(400).json({ 
      error: 'Pump is not running',
      currentState: systemState 
    });
  }
  
  const runTime = systemState.pumpStartTime 
    ? Date.now() - systemState.pumpStartTime 
    : 0;
  
  systemState.pumpOn = false;
  systemState.pumpStartTime = null;
  systemState.pumpDuration = 0;
  systemState.lastCommand = 'stop';
  systemState.lastCommandTime = Date.now();
  
  console.log(`Pump stopped. Was running for ${runTime}ms`);
  
  res.json({ 
    success: true, 
    message: 'Pump stopped',
    runTime: runTime
  });
});

// Connect to MQTT broker
function connectMQTT() {
  try {
    console.log(`Connecting to MQTT broker: ${mqttConfig.brokerUrl}`);
    mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      console.log(`Subscribing to topic: ${mqttConfig.topics.data}`);
      
      // Subscribe to device data topic
      mqttClient.subscribe(mqttConfig.topics.data, (err) => {
        if (err) {
          console.error('Failed to subscribe:', err.message);
        } else {
          console.log(`Successfully subscribed to ${mqttConfig.topics.data}`);
        }
      });
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error.message);
    });

    mqttClient.on('close', () => {
      console.log('MQTT connection closed');
    });

    mqttClient.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });

    // Handle incoming messages from device
    mqttClient.on('message', (topic, message) => {
      if (topic === mqttConfig.topics.data) {
        try {
          // Parse JSON message from device
          const data = JSON.parse(message.toString());
          console.log('Received sensor data:', data);
          
          // Update sensor data with timestamp
          sensorData = {
            temp: data.temp || data.temperature || sensorData.temp,
            hum: data.hum || data.humidity || sensorData.hum,
            soil: data.soil || data.soilMoisture || sensorData.soil,
            level: data.level || data.waterLevel || sensorData.level,
            flow: data.flow || data.flowRate || sensorData.flow,
            timestamp: Date.now()
          };
          
          console.log('Sensor data updated:', sensorData);
        } catch (error) {
          console.error('Failed to parse MQTT message:', error.message);
          console.error('Raw message:', message.toString());
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Ready to receive MQTT messages...`);
  
  // Connect to MQTT broker
  connectMQTT();
});

