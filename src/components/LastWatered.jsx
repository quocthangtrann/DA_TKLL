import React, { useEffect, useState } from "react";

const LS_KEY = "smart-watering-lastWatered";

function formatElapsed(ts) {
  if (!ts) return "Never";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return `${m}m ago`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
  }
  const d = new Date(ts);
  return d.toLocaleString();
}

/**
 * LastWatered - show time since last watering
 * Props:
 *  - lastWateredTimestamp (optional)
 *  - onClear (optional)
 */
export default function LastWatered({ lastWateredTimestamp, onClear }) {
  const [nowTick, setNowTick] = useState(Date.now());
  const [ts, setTs] = useState(() => {
    if (lastWateredTimestamp) return lastWateredTimestamp;
    const v = localStorage.getItem(LS_KEY);
    return v ? parseInt(v, 10) : null;
  });

  useEffect(() => {
    if (lastWateredTimestamp) setTs(lastWateredTimestamp);
  }, [lastWateredTimestamp]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onUpdate() {
      const v = localStorage.getItem(LS_KEY);
      setTs(v ? parseInt(v, 10) : null);
    }
    window.addEventListener("lastWateredUpdated", onUpdate);
    return () => window.removeEventListener("lastWateredUpdated", onUpdate);
  }, []);

  return (
    <div className="p-3 rounded-lg border bg-white/60">
      <div className="text-xs text-gray-500">Last watered</div>
      <div className="mt-2 text-lg font-semibold text-slate-800">{ts ? formatElapsed(ts) : "Never"}</div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            const now = Date.now();
            localStorage.setItem(LS_KEY, now.toString());
            window.dispatchEvent(new Event("lastWateredUpdated"));
          }}
          className="px-3 py-1 text-sm rounded-md border"
        >
          Mark now
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(LS_KEY);
            if (onClear) onClear();
            window.dispatchEvent(new Event("lastWateredUpdated"));
          }}
          className="px-3 py-1 text-sm rounded-md border text-red-600"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
