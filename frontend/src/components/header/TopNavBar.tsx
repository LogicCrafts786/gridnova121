import React from 'react';
import {
  Play, Pause, RotateCcw, RefreshCw, StepForward, AlertOctagon,
  ShieldCheck, Cpu, Battery, Zap, DollarSign, Leaf, Gauge, HelpCircle
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface TopNavBarProps {
  systemState: SystemStateResponse;
  isRunning: boolean;
  isOptimizing?: boolean;
  performanceMode: boolean;
  onTogglePlay: () => void;
  onReoptimize: () => void;
  onStepTime: () => void;
  onReset: () => void;
  onTogglePerformance: () => void;
  onOpenDisclaimers: () => void;
  onOpenDemoTour?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  systemState,
  isRunning,
  isOptimizing = false,
  performanceMode,
  onTogglePlay,
  onReoptimize,
  onStepTime,
  onReset,
  onTogglePerformance,
  onOpenDisclaimers,
  onOpenDemoTour
}) => {
  const { final_schedule, battery_state, telemetry, risk, is_emergency, emergency_label } = systemState;
  const totalGen = final_schedule.solar_mw + final_schedule.wind_mw + final_schedule.g1_mw + final_schedule.g2_mw + final_schedule.g3_mw;

  // Format hour 0-24 as HH:00
  const hourInt = Math.floor(telemetry.timestamp_hour);
  const minInt = Math.round((telemetry.timestamp_hour - hourInt) * 60);
  const timeFormatted = `${String(hourInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}`;

  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md px-4 py-2.5 flex flex-col gap-2 z-40 sticky top-0 shadow-xl">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm md:text-base tracking-wide bg-gradient-to-r from-slate-100 via-cyan-200 to-purple-300 bg-clip-text text-transparent">
                GRID NOVA – AI + HYBRID QUANTUM ENERGY SYSTEM
              </h1>
              {/* Mandatory Honest Disclaimers Badges */}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 tracking-wider">
                DEMO / SIMULATION MODE
              </span>
              <span className="hidden lg:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 border border-slate-700 text-slate-300">
                Electrical Model: Simplified Demo Power Balance
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Autonomous Microgrid Unit Commitment, Economic Dispatch & 3D Digital Twin
            </p>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        {is_emergency && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold animate-pulse">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
            <span>EMERGENCY CONTINGENCY ACTIVE: {emergency_label || 'CRITICAL RISK'}</span>
          </div>
        )}

        {/* Real-time Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Demo Tour Button */}
          {onOpenDemoTour && (
            <button
              onClick={onOpenDemoTour}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all border border-purple-400/30"
              title="Start 60-Second Guided Tour of Grid Nova"
            >
              <span>DEMO MODE (60s)</span>
            </button>
          )}

          {/* Main End-to-End RUN OPTIMIZATION Button */}
          <button
            onClick={onReoptimize}
            disabled={isOptimizing}
            className={`px-4 py-1.5 rounded-lg text-xs font-extrabold text-white flex items-center gap-1.5 transition-all shadow-lg ${
              isOptimizing
                ? 'bg-cyan-900/80 cursor-not-allowed text-cyan-200 ring-2 ring-cyan-500/50'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 ring-1 ring-cyan-400 shadow-cyan-950/50 hover:shadow-cyan-500/20'
            }`}
            title="Execute Entire 14-Stage Optimization Pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin text-cyan-300' : ''}`} />
            <span>{isOptimizing ? 'OPTIMIZING...' : 'RUN OPTIMIZATION'}</span>
          </button>

          {/* Simulated Time */}
          <div className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 text-xs font-mono flex items-center gap-1.5">
            <span className="text-slate-400">TIME:</span>
            <span className="font-bold text-cyan-300">{timeFormatted}</span>
          </div>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isRunning ? "Pause Real-Time Simulation Loop" : "Start Real-Time Simulation Loop"}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? "PAUSE" : "START"}</span>
          </button>

          {/* Step +1h */}
          <button
            onClick={onStepTime}
            className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
            title="Advance 1 Hour with Dynamic Battery SOC Integration"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span className="hidden md:inline">+1 hr</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Reset Microgrid to Default Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Performance Mode Toggle */}
          <button
            onClick={onTogglePerformance}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
              performanceMode
                ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Fast Laptop Performance Mode"
          >
            <Gauge className="w-3.5 h-3.5 inline mr-1" />
            <span className="hidden lg:inline">{performanceMode ? "Eco Graphics" : "HQ 3D"}</span>
          </button>

          {/* Disclaimers Button */}
          <button
            onClick={onOpenDisclaimers}
            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            title="Engineering Disclaimers & Mathematical Specifications"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Ticker Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
        {/* Real Demand */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Demand:</span>
          <span className="font-mono font-bold text-amber-300">{telemetry.base_demand_mw.toFixed(1)} MW</span>
        </div>

        {/* Total Generation */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Supply:</span>
          <span className="font-mono font-bold text-emerald-300">{totalGen.toFixed(1)} MW</span>
          <span className="text-[10px] text-slate-500">
            (Ren: {((final_schedule.solar_mw + final_schedule.wind_mw) / Math.max(1, telemetry.base_demand_mw) * 100).toFixed(0)}%)
          </span>
        </div>

        {/* Battery SOC */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <Battery className={`w-3.5 h-3.5 ${battery_state.current_soc_pct < 25 ? 'text-red-400' : 'text-cyan-400'}`} />
          <span className="text-slate-400">BESS SOC:</span>
          <span className="font-mono font-bold text-cyan-300">{battery_state.current_soc_pct.toFixed(1)}%</span>
          <span className="text-[10px] text-slate-500">
            ({final_schedule.battery_discharge_mw > 0 ? `-${final_schedule.battery_discharge_mw.toFixed(1)}MW` : (final_schedule.battery_charge_mw > 0 ? `+${final_schedule.battery_charge_mw.toFixed(1)}MW` : '0MW')})
          </span>
        </div>

        {/* Grid Net Flow */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <span className="text-slate-400">Grid Net:</span>
          <span className="font-mono font-bold text-purple-300">
            {final_schedule.grid_import_mw > 0
              ? `+${final_schedule.grid_import_mw.toFixed(1)} MW (Imp)`
              : final_schedule.grid_export_mw > 0
              ? `-${final_schedule.grid_export_mw.toFixed(1)} MW (Exp)`
              : '0.0 MW'}
          </span>
        </div>

        {/* Total Cost */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Operating Cost:</span>
          <span className="font-mono font-bold text-slate-100">${final_schedule.total_cost_usd.toFixed(2)}</span>
        </div>

        {/* CO2 Emissions */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0">
          <Leaf className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-400">Carbon:</span>
          <span className="font-mono font-bold text-slate-100">{final_schedule.co2_emissions_tons.toFixed(2)} tCO2</span>
        </div>

        {/* Constraint Violations Counter */}
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 shrink-0 ml-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Violations:</span>
          <span className="font-mono font-bold text-emerald-400">
            {final_schedule.violations.length}
          </span>
        </div>
      </div>
    </header>
  );
};
