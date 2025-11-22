import React, { useEffect, useState, useRef } from "react";
import SensorPanel from "../components/SensorPanel.jsx";
import PumpControl from "../components/PumpControl.jsx";
import LastWatered from "../components/LastWatered.jsx";
import {
  setPendingStop,
  registerHandlers,
  confirm as serviceConfirm,
  cancel as serviceCancel,
  clearPendingStop,
} from "../services/confirmServices";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
  const intervalRef = useRef(null);

  // Manual duration
  const [manualDurationSec, setManualDurationSec] = useState(10);

  // === Simulation loop ===
  useEffect(() => {
    const id = setInterval(() => {
      setSensors((s) => ({
        temp: Math.round(20 + Math.sin(Date.now() / 7000) * 4),
        hum: Math.min(100, Math.max(10, Math.round(s.hum + (Math.random() * 4 - 2)))),
        soil: Math.min(100, Math.max(0, Math.round(s.soil + (Math.random() * 2 - 1)))),
        level: Math.min(100, Math.max(0, Math.round(s.level + (Math.random() * 1.5 - 0.75)))),
        flow: pumpOn ? Math.round(60 + Math.random() * 10) : 0,
      }));
    }, 1500);
    return () => clearInterval(id);
  }, [pumpOn]);

  // === Automatic rule demo ===
  useEffect(() => {
    if (mode !== "automatic") return;
    if (sensors.soil < 40 && sensors.level > 20 && !pumpOn) {
      startPump("automatic", 8000);
    }
  }, [mode, sensors.soil, sensors.level]);

  // Keep ref in sync
  useEffect(() => {
    remainingRef.current = remainingMs;
  }, [remainingMs]);

  // Countdown loop
  useEffect(() => {
    if (pumpOn && remainingRef.current > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setRemainingMs((r) => {
          const next = r - 250;
          if (next <= 0) {
            completePump("automatic");
            return 0;
          }
          return next;
        });
      }, 250);
    }

    if (!pumpOn && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current && !pumpOn) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pumpOn]);

  // === History utilities ===
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

  // === Pump operations ===
  function startPump(modeLabel = "manual", durationMs = 10000) {
    if (pumpOn) return;
    setPumpOn(true);

    pumpStartRef.current = Date.now();
    setRemainingMs(durationMs);
  }

  function completePump(modeLabel = "manual") {
    if (!pumpOn) return;

    const start = pumpStartRef.current || Date.now();
    const durationMs = Date.now() - start;

    const flow = sensors.flow || 0;
    const liters = (flow * durationMs) / 60000.0;

    addHistoryEntry({
      timestamp: Date.now(),
      mode: modeLabel,
      durationMs,
      estimatedLiters: liters,
      sensors: { ...sensors },
      stoppedEarly: false,
    });

    setPumpOn(false);
    setRemainingMs(0);
    pumpStartRef.current = null;

    markLastWatered(Date.now());
  }

  function stopPumpEarly(modeLabel = "manual") {
    if (!pumpOn) return;

    const start = pumpStartRef.current || Date.now();
    const durationMs = Date.now() - start;

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

    setPumpOn(false);
    setRemainingMs(0);
    pumpStartRef.current = null;

    markLastWatered(Date.now());
  }

  // === Confirm-stop handlers ===
  useEffect(() => {
    registerHandlers({
      onConfirm: () => {
        stopPumpEarly("manual");
      },
      onCancel: () => {},
    });

    return () => {
      clearPendingStop();
    };
  }, []);

  function requestStopPump(modeLabel) {
    if (!pumpOn) return;

    if (remainingRef.current > 0) {
      setPendingStop({
        mode: modeLabel,
        remainingMs: remainingRef.current,
        sensors: { ...sensors },
      });

      navigate("/confirm-stop");
    } else {
      stopPumpEarly(modeLabel);
    }
  }

  // Manual start
  function handleManualStart() {
    const dur = manualDurationSec * 1000;
    startPump("manual", dur);
  }

  // === UI State ===
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
              onClick={() => setMode((m) => (m === "automatic" ? "manual" : "automatic"))}
              className={`px-4 py-2 rounded-full font-medium border ${
                mode === "automatic" ? "bg-white shadow" : "bg-white/60"
              }`}
            >
              {mode === "automatic" ? "Automatic" : "Manual"}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SENSOR PANEL */}
          <SensorPanel sensors={sensors} />

          {/* RIGHT SIDEBAR */}
          <aside className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-4">
            {/* Watering status */}
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

            {/* Manual duration */}
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

            {/* Pump Control */}
            <div>
              <h4 className="text-xs text-gray-500">Pump Control</h4>

              {!pumpOn ? (
                <button
                  onClick={() => {
                    if (mode === "manual") handleManualStart();
                    else startPump("automatic", 8000);
                  }}
                  className="w-full mt-3 px-4 py-3 rounded-2xl font-bold text-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Start Pump
                </button>
              ) : (
                <button
                  onClick={() => requestStopPump(mode)}
                  className="w-full mt-3 px-4 py-3 rounded-2xl font-bold text-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Stop Pump
                </button>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Manual stop may require confirmation if watering is not finished.
              </p>
            </div>

            {/* Last Watered */}
            <LastWatered
              lastWateredTimestamp={lastWatered}
              onClear={() => {
                setLastWatered(null);
                localStorage.removeItem(LS_KEY);
              }}
            />

            {/* Quick Actions */}
            <div className="mt-auto pt-2">
              <h4 className="text-xs text-gray-500">Quick actions</h4>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSensors((s) => ({ ...s, level: 100 }))}
                  className="flex-1 px-3 py-2 border rounded text-sm"
                >
                  Fill tank
                </button>
                <button
                  onClick={() => setSensors({ temp: 24, hum: 66, soil: 60, level: 56, flow: 0 })}
                  className="flex-1 px-3 py-2 border rounded text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="pt-4 text-xs text-gray-400">
              <p>
                Connected: <span className="text-green-600 font-semibold">●</span>
              </p>
              <p className="mt-1">Firmware: v1.2.3</p>
            </div>
          </aside>
        </main>

        <footer className="mt-6 text-sm text-gray-500 text-center">
          · Designed for ESP32 · 
        </footer>
      </div>
    </div>
  );
}
