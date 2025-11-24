import React, { useEffect, useState, useRef } from "react";
import SensorPanel from "../components/SensorPanel.jsx";
import PumpControl from "../components/PumpControl.jsx";
import LastWatered from "../components/LastWatered.jsx";
import websocketService from "../services/websocketService";
import apiService from "../services/apiService";

const LS_KEY = "smart-watering-lastWatered";
const LS_HISTORY = "smart-watering-history";

function formatMs(ms) {
  if (!ms || ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function SmartWateringDashboard() {

  const [mode, setMode] = useState("automatic");
  const [pumpOn, setPumpOn] = useState(false);
  const [lastWatered, setLastWatered] = useState(() => {
    const v = localStorage.getItem(LS_KEY);
    return v ? parseInt(v, 10) : null;
  });

  // Sensors
  const [sensors, setSensors] = useState({
    temp: 24,
    hum: 66,
    soil: 60,
    level: 56,
    flow: 0,
  });

  // Pump timing
  const [remainingMs, setRemainingMs] = useState(0);
  const remainingRef = useRef(0);
  const pumpStartRef = useRef(null);
  const pumpDurationRef = useRef(0);
  const intervalRef = useRef(null);

  // Manual duration
  const [manualDurationSec, setManualDurationSec] = useState(10);
  
  // Connection status
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stopConfirmData, setStopConfirmData] = useState(null);
  const [isStopSubmitting, setIsStopSubmitting] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Handle sensor updates from WebSocket
    const handleSensorUpdate = (data) => {
      setSensors({
        temp: data.temp || 0,
        hum: data.hum || 0,
        soil: data.soil || 0,
        level: data.level || 0,
        flow: data.flow || 0,
      });
    };

    // Handle status updates from WebSocket
    const handleStatusUpdate = (data) => {
      setPumpOn(data.pumpOn || false);
      setMode(data.mode || "automatic");
      setRemainingMs(data.remainingTime || 0);
      
      if (data.pumpStartTime) {
        pumpStartRef.current = data.pumpStartTime;
        pumpDurationRef.current = data.pumpDuration || 0;
      } else {
        pumpStartRef.current = null;
        pumpDurationRef.current = 0;
      }
    };

    // Handle mode updates
    const handleModeUpdate = (data) => {
      setMode(data.mode || "automatic");
    };

    // Handle connection status
    const handleConnect = () => {
      setIsConnected(true);
      setIsLoading(false);
      // Request current data
      websocketService.requestSensors();
      websocketService.requestStatus();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Register event listeners
    websocketService.on('sensor_update', handleSensorUpdate);
    websocketService.on('status_update', handleStatusUpdate);
    websocketService.on('mode_update', handleModeUpdate);
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);

    // If socket is already connected (e.g., returning from confirm page),
    // manually trigger connect handler so UI state stays in sync.
    if (websocketService.isConnected()) {
      handleConnect();
    }

    // Initial data fetch via API
    const fetchInitialData = async () => {
      try {
        const [sensorData, statusData] = await Promise.all([
          apiService.getSensors(),
          apiService.getStatus(),
        ]);
        
        setSensors({
          temp: sensorData.temp || 0,
          hum: sensorData.hum || 0,
          soil: sensorData.soil || 0,
          level: sensorData.level || 0,
          flow: sensorData.flow || 0,
        });
        
        setPumpOn(statusData.pumpOn || false);
        setMode(statusData.mode || "automatic");
        setRemainingMs(statusData.remainingTime || 0);
        
        if (statusData.pumpStartTime) {
          pumpStartRef.current = statusData.pumpStartTime;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Cleanup
    return () => {
      websocketService.off('sensor_update', handleSensorUpdate);
      websocketService.off('status_update', handleStatusUpdate);
      websocketService.off('mode_update', handleModeUpdate);
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
    };
  }, []);

  // Automatic rules
  useEffect(() => {
    if (mode !== "automatic") return;
    if (sensors.soil < 40 && sensors.level > 20 && !pumpOn) {
      handleAutoStart();
    }
  }, [mode, sensors.soil, sensors.level, pumpOn]);

  // Keep ref in sync
  useEffect(() => {
    remainingRef.current = remainingMs;
  }, [remainingMs]);

  // Update remaining time from WebSocket status updates
  useEffect(() => {
    if (pumpOn && remainingMs > 0) {
      const interval = setInterval(() => {
        if (pumpStartRef.current) {
          const elapsed = Date.now() - pumpStartRef.current;
          const remaining = Math.max(0, pumpDurationRef.current - elapsed);
          setRemainingMs(remaining);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [pumpOn, remainingMs]);

  // History Implementation
  function addHistoryEntry(entry) {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(entry);
      localStorage.setItem(LS_HISTORY, JSON.stringify(arr));
      window.dispatchEvent(new Event("wateringHistoryUpdated"));
    } catch (e) {
      console.error("Failed to write history", e);
    }
  }

  function markLastWatered(ts = Date.now()) {
    setLastWatered(ts);
    localStorage.setItem(LS_KEY, ts.toString());
    window.dispatchEvent(new Event("lastWateredUpdated"));
  }

  // Start pump
  async function startPump(modeLabel = "manual", durationSec = 10) {
    if (pumpOn) return;
    
    try {
      await apiService.startPump(durationSec);
      // State will be updated via WebSocket
    } catch (error) {
      console.error('Failed to start pump:', error);
      alert('Failed to start pump: ' + error.message);
    }
  }

  // Auto start pump
  async function handleAutoStart() {
    try {
      await apiService.startPump(8); // 8 seconds for automatic mode
    } catch (error) {
      console.error('Failed to auto-start pump:', error);
    }
  }

  // Stop pump early
  async function stopPumpEarly(modeLabel = "manual", { force = false } = {}) {
    if (!pumpOn && !force) return;

    try {
      setIsStopSubmitting(true);
      const result = await apiService.stopPump();
      
      // Add to history
      const start = pumpStartRef.current || Date.now();
      const durationMs = result.runTime || (Date.now() - start);
      const flow = sensors.flow || 0;
      const liters = (flow * durationMs) / 60000.0;

      addHistoryEntry({
        timestamp: Date.now(),
        mode: modeLabel,
        durationMs,
        estimatedLiters: liters,
        sensors: { ...sensors },
        stoppedEarly: true,
      });

      markLastWatered(Date.now());
      // State will be updated via WebSocket
    } catch (error) {
      console.error('Failed to stop pump:', error);
      alert('Failed to stop pump: ' + error.message);
    } finally {
      setIsStopSubmitting(false);
    }
  }

  function requestStopPump(modeLabel) {
    if (!pumpOn) return;
    setStopConfirmData({
      mode: modeLabel,
      remainingMs: remainingRef.current,
      sensors: { ...sensors },
    });
  }

  function handleCancelStop() {
    if (isStopSubmitting) return;
    setStopConfirmData(null);
  }

  async function handleConfirmStop() {
    if (!stopConfirmData) return;
    await stopPumpEarly(stopConfirmData.mode || "manual", { force: true });
    setStopConfirmData(null);
  }

  // Manual start
  async function handleManualStart() {
    await startPump("manual", manualDurationSec);
  }

  // Handle mode toggle
  async function handleModeToggle() {
    const newMode = mode === "automatic" ? "manual" : "automatic";
    try {
      await apiService.setMode(newMode);
      // State will be updated via WebSocket
    } catch (error) {
      console.error('Failed to change mode:', error);
      alert('Failed to change mode: ' + error.message);
    }
  }

  // UI State
  const statusText = pumpOn
    ? `Watering — remaining ${formatMs(remainingMs)}`
    : "Not watering";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-white via-slate-50 to-gray-50 p-6 rounded-2xl shadow-lg">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Smart Watering Dashboard</h1>
            <p className="text-sm text-gray-500">Live sensor status & remote control</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">Mode</p>
            <button
              onClick={handleModeToggle}
              disabled={isLoading}
              className={`px-4 py-2 rounded-full font-medium border ${
                mode === "automatic" ? "bg-white shadow" : "bg-white/60"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {mode === "automatic" ? "Automatic" : "Manual"}
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
              <span className="text-xs text-gray-500">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sensor Panel */}
          <SensorPanel sensors={sensors} />

          {/* Right Sidebar */}
          <aside className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-4">
            {/* Watering Status */}
            <div>
              <h4 className="text-xs text-gray-500">Watering status</h4>
              <div
                className={`mt-2 p-3 rounded-md border ${
                  pumpOn ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className={`text-lg font-semibold ${pumpOn ? "text-green-700" : "text-gray-700"}`}>
                  {statusText}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {pumpOn ? "Pump is running" : "System idle"}
                </div>
              </div>
            </div>

            {/* Manual Duration */}
            <div>
              <h4 className="text-xs text-gray-500">Manual watering duration</h4>
              <select
                value={manualDurationSec}
                onChange={(e) => setManualDurationSec(parseInt(e.target.value))}
                className="mt-2 px-3 py-1 border rounded text-sm"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
              </select>
            </div>

            {/* Pump Control Button */}
            <div>
              <h4 className="text-xs text-gray-500">Pump Control</h4>

              {!pumpOn ? (
                <button
                  onClick={() => {
                    if (mode === "manual") handleManualStart();
                    else startPump("automatic", 8);
                  }}
                  disabled={isLoading || !isConnected}
                  className={`w-full mt-3 px-4 py-3 rounded-2xl font-bold text-lg bg-green-600 text-white hover:bg-green-700 ${
                    isLoading || !isConnected ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Start Pump
                </button>
              ) : (
                <button
                  onClick={() => requestStopPump(mode)}
                  disabled={isLoading || !isConnected}
                  className={`w-full mt-3 px-4 py-3 rounded-2xl font-bold text-lg bg-red-500 text-white hover:bg-red-600 ${
                    isLoading || !isConnected ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Stop Pump
                </button>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Manual stop may require confirmation if watering is not finished.
              </p>
            </div>

            {/* Last Watered Timestamp */}
            <LastWatered
              lastWateredTimestamp={lastWatered}
              onClear={() => {
                setLastWatered(null);
                localStorage.removeItem(LS_KEY);
              }}
            />


            <div className="pt-4 text-xs text-gray-400">
              <p>
                Backend: <span className={isConnected ? "text-green-600" : "text-red-600"}>{isConnected ? "● Connected" : "● Disconnected"}</span>
              </p>
              <p className="mt-1">Firmware: v1.2.3</p>
            </div>
          </aside>
        </main>

        <footer className="mt-6 text-sm text-gray-500 text-center">
          · Designed for ESP32 · 
        </footer>
      </div>

      {stopConfirmData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Stop watering early?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Pump still has <strong>{formatMs(stopConfirmData.remainingMs)}</strong> remaining.
              Stopping now will end the cycle early and log a shortened run.
            </p>

            <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm">
              <div><strong>Mode:</strong> {stopConfirmData.mode}</div>
              <div><strong>Remaining:</strong> {formatMs(stopConfirmData.remainingMs)}</div>
              <div className="text-xs text-gray-600 mt-2">
                Temp: {stopConfirmData.sensors?.temp}°C · Hum: {stopConfirmData.sensors?.hum}% · Soil: {stopConfirmData.sensors?.soil}% · Level: {stopConfirmData.sensors?.level}%
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelStop}
                disabled={isStopSubmitting}
                className={`px-4 py-2 rounded border text-sm font-medium ${
                  isStopSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStop}
                disabled={isStopSubmitting}
                className={`px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold shadow ${
                  isStopSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
                }`}
              >
                {isStopSubmitting ? "Stopping..." : "Stop anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
