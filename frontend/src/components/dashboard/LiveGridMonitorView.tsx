import React, { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, ArrowRight, ShieldCheck, Zap, Sun, Wind
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface LiveGridMonitorViewProps {
  systemState: SystemStateResponse;
  onReoptimize: () => void;
}

export const LiveGridMonitorView: React.FC<LiveGridMonitorViewProps> = ({
  systemState,
  onReoptimize
}) => {
  const { telemetry, forecast, final_schedule, active_pipeline_stage, explanation } = systemState;

  // Real-time telemetry simulation
  const [errorThresholdPct, setErrorThresholdPct] = useState<number>(12.0);
  const [actualDemand, setActualDemand] = useState<number>(telemetry.base_demand_mw);
  const [actualSolar, setActualSolar] = useState<number>(telemetry.solar_potential_mw);
  const [actualWind, setActualWind] = useState<number>(telemetry.wind_potential_mw);

  const forecastDemand = forecast.steps[0]?.demand_expected_mw ?? telemetry.base_demand_mw;
  const forecastSolar = forecast.steps[0]?.solar_expected_mw ?? telemetry.solar_potential_mw;
  const forecastWind = forecast.steps[0]?.wind_expected_mw ?? telemetry.wind_potential_mw;

  // Calculate percentage forecast errors
  const demandErrorPct = Math.abs((actualDemand - forecastDemand) / Math.max(1, forecastDemand)) * 100;
  const solarErrorPct = Math.abs((actualSolar - forecastSolar) / Math.max(1, forecastSolar)) * 100;
  const windErrorPct = Math.abs((actualWind - forecastWind) / Math.max(1, forecastWind)) * 100;

  const maxErrorPct = Math.max(demandErrorPct, solarErrorPct, windErrorPct);
  const isThresholdExceeded = maxErrorPct >= errorThresholdPct;

  // Auto-inject slight random noise into actual telemetry every 4 seconds to simulate live grid sensors
  useEffect(() => {
    const timer = setInterval(() => {
      setActualDemand(prev => +(telemetry.base_demand_mw * (1 + (Math.random() * 0.14 - 0.07))).toFixed(1));
      setActualSolar(prev => +(telemetry.solar_potential_mw * (1 + (Math.random() * 0.16 - 0.08))).toFixed(1));
      setActualWind(prev => +(telemetry.wind_potential_mw * (1 + (Math.random() * 0.20 - 0.10))).toFixed(1));
    }, 4000);
    return () => clearInterval(timer);
  }, [telemetry]);

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full text-slate-100">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
          <Activity className="w-4 h-4 text-cyan-400" />
          Live Grid Monitor & Automated Re-Optimization Trigger
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Real-time sensor telemetry comparison against time-series forecast models. Detects forecast deviations beyond allowable thresholds and initiates automated closed-loop re-optimization.
        </p>
      </div>

      {/* Real-Time Status Banner */}
      <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition-all ${
        isThresholdExceeded
          ? 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-950/40 text-amber-200'
          : 'bg-emerald-950/70 border-emerald-500/80 shadow-lg shadow-emerald-950/30 text-emerald-200'
      }`}>
        <div className="flex items-start gap-2.5">
          {isThresholdExceeded ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide">
              {isThresholdExceeded
                ? 'Forecast Error Detected → Dynamic Re-Optimization Required'
                : 'Sensor Deviations Within Threshold → Continue Existing Schedule'}
            </h3>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              {isThresholdExceeded
                ? `Sensors detected maximum deviation of ${maxErrorPct.toFixed(1)}% (exceeds ${errorThresholdPct}% threshold). Closed-loop controller signals pipeline execution: New Data → Forecast Update → Risk Analysis → Hybrid Quantum QUBO → Classical Repair → Feasible Schedule.`
                : `Maximum deviation across load and renewable feeds is ${maxErrorPct.toFixed(1)}% (within tolerance ≤ ${errorThresholdPct}%). Grid frequency and active power balance are maintained without unnecessary redispatch.`}
            </p>
          </div>
        </div>

        <button
          onClick={onReoptimize}
          className={`px-4 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-md ${
            isThresholdExceeded
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RE-OPTIMIZE NOW
        </button>
      </div>

      {/* Threshold Configuration Slider */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Allowable Forecast Error Tolerance Threshold:
          </span>
          <span className="font-mono text-cyan-300 font-bold">{errorThresholdPct.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min="5.0"
          max="30.0"
          step="0.5"
          value={errorThresholdPct}
          onChange={e => setErrorThresholdPct(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Strict Sensitivity (5%)</span>
          <span>Nominal (12%)</span>
          <span>Relaxed Tolerance (30%)</span>
        </div>
      </div>

      {/* Actual Sensor vs Forecast Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Demand Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> Demand Feed</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              demandErrorPct >= errorThresholdPct ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
            }`}>
              Δ {demandErrorPct.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">Forecast Expected:</span>
              <span className="font-mono font-bold text-slate-200">{forecastDemand.toFixed(1)} MW</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Live Sensor Actual:</span>
              <span className="font-mono font-bold text-amber-300">{actualDemand.toFixed(1)} MW</span>
            </div>
          </div>
        </div>

        {/* Solar Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-300">
            <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-400" /> Solar Irradiance</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              solarErrorPct >= errorThresholdPct ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
            }`}>
              Δ {solarErrorPct.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">Forecast Expected:</span>
              <span className="font-mono font-bold text-slate-200">{forecastSolar.toFixed(1)} MW</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Live Sensor Actual:</span>
              <span className="font-mono font-bold text-yellow-300">{actualSolar.toFixed(1)} MW</span>
            </div>
          </div>
        </div>

        {/* Wind Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-teal-300">
            <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-teal-400" /> Wind Velocity</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              windErrorPct >= errorThresholdPct ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
            }`}>
              Δ {windErrorPct.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">Forecast Expected:</span>
              <span className="font-mono font-bold text-slate-200">{forecastWind.toFixed(1)} MW</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Live Sensor Actual:</span>
              <span className="font-mono font-bold text-teal-300">{actualWind.toFixed(1)} MW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Dispatched Schedule Summary */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
        <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Active Operating Schedule & Reasoning
        </h3>
        <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          {explanation.summary}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block">Active Stage:</span>
            <span className="font-bold text-emerald-300">{active_pipeline_stage}</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block">Total Gen Supply:</span>
            <span className="font-bold text-cyan-300">
              {(final_schedule.solar_mw + final_schedule.wind_mw + final_schedule.g1_mw + final_schedule.g2_mw + final_schedule.g3_mw + final_schedule.grid_import_mw).toFixed(1)} MW
            </span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block">Spinning Reserve:</span>
            <span className="font-bold text-purple-300">{final_schedule.reserve_margin_mw.toFixed(1)} MW</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block">Operating Cost:</span>
            <span className="font-bold text-amber-300">${final_schedule.total_cost_usd.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
