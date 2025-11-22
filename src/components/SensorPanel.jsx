import React from "react";
import CircleGauge from "../components/CircleGauge.jsx";

/**
 * SensorPanel - 2x2 grid for four main gauges
 * Props:
 *  - sensors: { temp, hum, soil, level, flow? }
 */
export default function SensorPanel({ sensors }) {
  const gaugeSize = 160;
  const gaugeStroke = 14;

  return (
    <section className="col-span-2 bg-white p-6 rounded-xl shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Row 1 - two gauges */}
        <div className="flex justify-center">
          <div className="text-center">
            <CircleGauge
              value={sensors.temp}
              label="Temperature"
              unit="°C"
              color="#FB7185"
              size={gaugeSize}
              stroke={gaugeStroke}
            />
            <div className="mt-2 text-xs text-gray-500">Ambient</div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="text-center">
            <CircleGauge
              value={sensors.hum}
              label="Humidity"
              unit="%"
              color="#60A5FA"
              size={gaugeSize}
              stroke={gaugeStroke}
            />
            <div className="mt-2 text-xs text-gray-500">Ambient</div>
          </div>
        </div>

        {/* Row 2 - two gauges */}
        <div className="flex justify-center">
          <div className="text-center">
            <CircleGauge
              value={sensors.soil}
              label="Soil moisture"
              unit="%"
              color="#D97706"
              size={gaugeSize}
              stroke={gaugeStroke}
            />
            <div className="mt-2 text-xs text-gray-500">Root zone</div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="text-center">
            <CircleGauge
              value={sensors.level}
              label="Water level"
              unit="%"
              color="#38BDF8"
              size={gaugeSize}
              stroke={gaugeStroke}
            />
            <div className="mt-2 text-xs text-gray-500">Tank</div>
          </div>
        </div>
      </div>
    </section>
  );
}
