import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingStop, confirm, cancel, clearPendingStop } from "../services/confirmServices";

function formatMs(ms) {
  if (!ms || ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function ConfirmStopPage() {
  const nav = useNavigate();
  const [pending, setPending] = useState(getPendingStop());

  useEffect(() => {
    // if no pending request, redirect back
    if (!pending) {
      nav(-1);
      return;
    }

    return () => {
      // cleanup if page unloads
      clearPendingStop();
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Stop watering early?</h2>
        <p className="text-sm text-gray-600 mb-4">
          The pump still has <strong>{formatMs(pending.remainingMs)}</strong> remaining.
          If you stop now, watering will end early and the system will record a shortened cycle.
        </p>

        <div className="mb-4 bg-gray-50 p-3 rounded text-sm">
          <div><strong>Mode:</strong> {pending.mode}</div>
          <div><strong>Remaining:</strong> {formatMs(pending.remainingMs)}</div>
          <div><strong>Sensor snapshot:</strong></div>
          <div className="text-xs text-gray-600 mt-1">
            Temp: {pending.sensors?.temp}°C — Hum: {pending.sensors?.hum}% — Soil: {pending.sensors?.soil}% — Level: {pending.sensors?.level}%
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={async () => {
              await cancel();
              nav(-1);
            }}
            className="px-4 py-2 rounded border"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              await confirm();
              nav(-1);
            }}
            className="px-4 py-2 rounded bg-red-600 text-white"
          >
            Stop anyway
          </button>
        </div>
      </div>
    </div>
  );
}
