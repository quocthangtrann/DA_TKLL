import React, { useEffect, useState } from "react";

const LS_HISTORY = "smart-watering-history";

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function HistoryPage() {
  const [rows, setRows] = useState(() => {
    const v = localStorage.getItem(LS_HISTORY);
    return v ? JSON.parse(v) : [];
  });

  useEffect(() => {
    function onUpdate() {
      const v = localStorage.getItem(LS_HISTORY);
      setRows(v ? JSON.parse(v) : []);
    }
    window.addEventListener("wateringHistoryUpdated", onUpdate);
    return () => window.removeEventListener("wateringHistoryUpdated", onUpdate);
  }, []);

  function clearAll() {
    if (!confirm("Clear all history?")) return;
    localStorage.removeItem(LS_HISTORY);
    setRows([]);
    window.dispatchEvent(new Event("wateringHistoryUpdated"));
  }

  function exportCSV() {
    if (!rows.length) return alert("No data");
    const header = ["timestamp,mode,duration_ms,liters,temp,hum,soil,level,flow"];
    const lines = rows.map(r =>
      `${r.timestamp},${r.mode},${r.durationMs},${r.estimatedLiters.toFixed(3)},${r.sensors.temp},${r.sensors.hum},${r.sensors.soil},${r.sensors.level},${r.sensors.flow}`
    );
    const csv = header.concat(lines).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "watering_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Watering History</h2>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-3 py-1 border rounded">Export CSV</button>
            <button onClick={clearAll} className="px-3 py-1 border rounded text-red-600">Clear</button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-gray-500">No watering records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2">Time</th>
                  <th>Mode</th>
                  <th>Duration</th>
                  <th>Liters</th>
                  <th>Temp</th>
                  <th>Hum</th>
                  <th>Soil</th>
                  <th>Level</th>
                  <th>Flow</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">{formatDate(r.timestamp)}</td>
                    <td>{r.mode}</td>
                    <td>{Math.round(r.durationMs)} ms</td>
                    <td>{r.estimatedLiters.toFixed(3)}</td>
                    <td>{r.sensors.temp}</td>
                    <td>{r.sensors.hum}</td>
                    <td>{r.sensors.soil}</td>
                    <td>{r.sensors.level}</td>
                    <td>{r.sensors.flow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
