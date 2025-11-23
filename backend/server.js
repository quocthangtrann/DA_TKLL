import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { mqttConfig } from './config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize MQTT client
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

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Watering Backend is running' });
});

// Get current sensor data
app.get('/api/sensors', (req, res) => {
  res.json(sensorData);
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

