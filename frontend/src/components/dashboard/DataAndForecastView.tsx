import React, { useState } from 'react';
import {
  Sliders, LineChart as ChartIcon, CheckCircle2, RotateCcw,
  Zap, Sun, Wind, Battery, ShieldAlert, Cpu
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, Area, ComposedChart
} from 'recharts';
import { SystemStateResponse, WhatIfOverrides } from '../../types/api';

interface DataAndForecastViewProps {
  systemState: SystemStateResponse;
  onApplyOverrides: (overrides: WhatIfOverrides) => void;
  onResetDefaults: () => void;
}

export const DataAndForecastView: React.FC<DataAndForecastViewProps> = ({
  systemState,
  onApplyOverrides,
  onResetDefaults
}) => {
  const { telemetry, forecast, generators, battery_state, grid_interconnect, renewables } = systemState;

  // Editable local state initialized with current system data
  const [demandScaling, setDemandScaling] = useState(1.0);
  const [solarScaling, setSolarScaling] = useState(1.0);
  const [windScaling, setWindScaling] = useState(1.0);

  const [customDemand, setCustomDemand] = useState(Math.round(telemetry.base_demand_mw));
  const [peakDemand, setPeakDemand] = useState(185);
  const [minDemand, setMinDemand] = useState(110);

  const [activeTab, setActiveTab] = useState<'inputs' | 'forecast'>('inputs');

  const handleApply = () => {
    onApplyOverrides({
      demand_scaling_factor: demandScaling,
      solar_scaling_factor: solarScaling,
      wind_scaling_factor: windScaling,
      g1_available: generators[0]?.is_available ?? true,
      g2_available: generators[1]?.is_available ?? true,
      g3_available: generators[2]?.is_available ?? true,
      battery_available: battery_state.is_available,
      grid_available: grid_interconnect.is_available
    });
  };

  const handleReset = () => {
    setDemandScaling(1.0);
    setSolarScaling(1.0);
    setWindScaling(1.0);
    setCustomDemand(Math.round(telemetry.base_demand_mw));
    onResetDefaults();
  };

  // Forecast chart data mapping
  const chartData = forecast.steps.map(step => ({
    hour: `${String(step.hour).padStart(2, '0')}:00`,
    demand: step.demand_expected_mw,
    demandUpper: step.demand_upper_mw,
    demandLower: step.demand_lower_mw,
    solar: step.solar_expected_mw,
    solarUpper: step.solar_upper_mw,
    solarLower: step.solar_lower_mw,
    wind: step.wind_expected_mw,
    windUpper: step.wind_upper_mw,
    windLower: step.wind_lower_mw
  }));

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full text-slate-100">
      {/* Sub-header & Mode Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Data Input & AI Forecasting Engine
          </h2>
          <p className="text-[11px] text-slate-400">
            Configure operational parameters, view baseline demo inputs, and inspect probabilistic time-series forecasts.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('inputs')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'inputs' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Editable Inputs
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'forecast' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            24h AI Forecast Bands
          </button>
        </div>
      </div>

      {activeTab === 'inputs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> Demand Scaling</span>
                <span className="text-cyan-300 font-mono">{(demandScaling * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={demandScaling}
                onChange={e => setDemandScaling(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-400" /> Solar Scaling</span>
                <span className="text-yellow-300 font-mono">{(solarScaling * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={solarScaling}
                onChange={e => setSolarScaling(parseFloat(e.target.value))}
                className="w-full accent-yellow-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-teal-400" /> Wind Scaling</span>
                <span className="text-teal-300 font-mono">{(windScaling * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={windScaling}
                onChange={e => setWindScaling(parseFloat(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Defaults
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply Inputs & Re-Optimize
            </button>
          </div>

          {/* Detailed Input Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Demand Specifications */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Demand Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Current Demand:</span>
                  <span className="text-sm font-bold text-amber-300">{telemetry.base_demand_mw.toFixed(1)} MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">24h Peak Demand:</span>
                  <span className="text-sm font-bold text-slate-200">{peakDemand} MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">24h Minimum Demand:</span>
                  <span className="text-sm font-bold text-slate-200">{minDemand} MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Current Hour:</span>
                  <span className="text-sm font-bold text-cyan-300">{telemetry.timestamp_hour.toFixed(1)}:00</span>
                </div>
              </div>
            </div>

            {/* Battery BESS Specifications */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h3 className="font-bold text-blue-300 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-blue-400" />
                Battery Storage (BESS) Parameters
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Storage Capacity:</span>
                  <span className="font-bold text-slate-200">{battery_state.capacity_mwh} MWh</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Current SOC:</span>
                  <span className="font-bold text-blue-300">{battery_state.current_soc_pct.toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Allowed SOC Range:</span>
                  <span className="font-bold text-slate-200">[{battery_state.min_soc_pct}% - {battery_state.max_soc_pct}%]</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Max Charge/Discharge:</span>
                  <span className="font-bold text-slate-200">±{battery_state.max_discharge_mw} MW</span>
                </div>
              </div>
            </div>

            {/* Generators Specifications */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 md:col-span-2">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Conventional Generator Fleet Specifications
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-1.5">Unit</th>
                      <th className="pb-1.5">Capacity Range</th>
                      <th className="pb-1.5">Ramp Limit</th>
                      <th className="pb-1.5">Marginal Cost</th>
                      <th className="pb-1.5">CO₂ Factor</th>
                      <th className="pb-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {generators.map(g => (
                      <tr key={g.id} className="hover:bg-slate-800/30">
                        <td className="py-1.5 font-bold text-cyan-300">{g.name}</td>
                        <td className="py-1.5">{g.min_mw} – {g.max_mw} MW</td>
                        <td className="py-1.5">±{g.ramp_rate_mw} MW/h</td>
                        <td className="py-1.5 text-amber-300">${g.cost_per_mwh}/MWh</td>
                        <td className="py-1.5">{g.emission_factor_t_per_mwh} t/MWh</td>
                        <td className="py-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            g.is_available && !g.forced_offline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                          }`}>
                            {g.is_available && !g.forced_offline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grid Interconnect & Reserves */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 md:col-span-2">
              <h3 className="font-bold text-purple-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                Interconnect & Reliability Constraints
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Max Import Limit:</span>
                  <span className="font-bold text-purple-300">{grid_interconnect.max_import_mw} MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Max Export Limit:</span>
                  <span className="font-bold text-purple-300">{grid_interconnect.max_export_mw} MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Spinning Reserve Req:</span>
                  <span className="font-bold text-emerald-300">≥ 25.0 MW</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block">Import Energy Cost:</span>
                  <span className="font-bold text-amber-300">${grid_interconnect.cost_import_per_mwh}/MWh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Performance & Model Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Forecast Model</span>
              <span className="font-bold text-cyan-300">{forecast.forecast_mode}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Horizon</span>
              <span className="font-bold text-slate-200">{forecast.horizon_hours} Hours Rolling</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Mean Abs Pct Error (MAPE)</span>
              <span className="font-bold text-emerald-300">{forecast.mape_pct}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Confidence Score</span>
              <span className="font-bold text-purple-300">{(forecast.confidence_score * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* 24h Composite Forecast Chart */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ChartIcon className="w-3.5 h-3.5 text-cyan-400" />
              24-Hour Rolling Demand, Solar, & Wind Forecast
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" MW" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="demand" stroke="#f59e0b" strokeWidth={2.5} name="Demand (Expected)" dot={false} />
                  <Line type="monotone" dataKey="solar" stroke="#eab308" strokeWidth={2} name="Solar Potential" dot={false} />
                  <Line type="monotone" dataKey="wind" stroke="#14b8a6" strokeWidth={2} name="Wind Potential" dot={false} />
                  <Area type="monotone" dataKey="demandUpper" stroke="none" fill="#f59e0b" fillOpacity={0.08} name="Demand Uncertainty Band" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
