import React from "react";

/**
 * PumpControl
 * Props:
 *  - pumpOn: boolean
 *  - mode: "automatic" | "manual"
 *  - togglePump: function
 */
export default function PumpControl({ pumpOn, mode, togglePump }) {
  return (
    <div>
      <h4 className="text-xs text-gray-500">Pump Control</h4>
      <div className="mt-3">
        <button
          onClick={togglePump}
          className={`w-full px-4 py-3 rounded-2xl font-bold text-lg transition-shadow focus:outline-none ${
            pumpOn ? "bg-red-500 text-white shadow-lg hover:bg-red-600" : "bg-white border text-gray-800 hover:shadow-md"
          }`}
          aria-pressed={pumpOn}
          disabled={mode !== "manual"}
        >
          {pumpOn ? "Pump ON" : "Pump OFF"}
        </button>
        <div className="mt-2 text-xs text-gray-500">Manual control only works when mode = Manual</div>
      </div>
    </div>
  );
}
