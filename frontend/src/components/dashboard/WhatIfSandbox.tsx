import React, { useState } from 'react';
import {
  Sliders, AlertOctagon, RotateCcw, Power, Sun, Wind, Zap, Battery, Globe
} from 'lucide-react';
import { SystemStateResponse, WhatIfOverrides } from '../../types/api';

interface WhatIfSandboxProps {
  systemState: SystemStateResponse;
  onApplyWhatIf: (overrides: WhatIfOverrides) => void;
  onTriggerEmergency: (event: string) => void;
  onReset: () => void;
}

export const WhatIfSandbox: React.FC<WhatIfSandboxProps> = ({
  systemState,
  onApplyWhatIf,
  onTriggerEmergency,
  onReset
}) => {
  const [solarScale, setSolarScale] = useState(1.0);
  const [windScale, setWindScale] = useState(1.0);
  const [demandScale, setDemandScale] = useState(1.0);

  const [g1Avail, setG1Avail] = useState(true);
  const [g2Avail, setG2Avail] = useState(true);
  const [g3Avail, setG3Avail] = useState(true);
  const [battAvail, setBattAvail] = useState(true);
  const [gridAvail, setGridAvail] = useState(true);

  const applyChanges = (updates: Partial<{
    solar: number;
    wind: number;
    demand: number;
    g1: boolean;
    g2: boolean;
    g3: boolean;
    batt: boolean;
    grid: boolean;
  }>) => {
    const s = updates.solar !== undefined ? updates.solar : solarScale;
    const w = updates.wind !== undefined ? updates.wind : windScale;
    const d = updates.demand !== undefined ? updates.demand : demandScale;
    const g1 = updates.g1 !== undefined ? updates.g1 : g1Avail;
    const g2 = updates.g2 !== undefined ? updates.g2 : g2Avail;
    const g3 = updates.g3 !== undefined ? updates.g3 : g3Avail;
    const b = updates.batt !== undefined ? updates.batt : battAvail;
    const gr = updates.grid !== undefined ? updates.grid : gridAvail;

    onApplyWhatIf({
      solar_scaling_factor: s,
      wind_scaling_factor: w,
      demand_scaling_factor: d,
      g1_available: g1,
      g2_available: g2,
      g3_available: g3,
      battery_available: b,
      grid_available: gr
    });
  };

  const handleResetSliders = () => {
    setSolarScale(1.0);
    setWindScale(1.0);
    setDemandScale(1.0);
    setG1Avail(true);
    setG2Avail(true);
    setG3Avail(true);
    setBattAvail(true);
    setGridAvail(true);
    onTriggerEmergency('CLEAR');
    onReset();
  };

  const emergencyEvents = [
    { id: 'SOLAR_DROP', label: 'SOLAR DROP', desc: 'Sudden 90% cloud cover collapse', color: 'from-amber-700 to-yellow-800' },
    { id: 'WIND_DROP', label: 'WIND DROP', desc: 'Wind speeds plunge below cut-in', color: 'from-cyan-800 to-teal-900' },
    { id: 'DEMAND_SPIKE', label: 'DEMAND SPIKE', desc: '+45% sudden industrial heatwave surge', color: 'from-orange-700 to-red-800' },
    { id: 'G1_FAILURE', label: 'G1 CCGT TRIP', desc: 'Base-load boiler trip (45 MW loss)', color: 'from-red-800 to-rose-900' },
    { id: 'BATTERY_FAILURE', label: 'BESS OUTAGE', desc: 'DC bus isolation; zero storage', color: 'from-blue-900 to-indigo-950' },
    { id: 'GRID_FAILURE', label: 'GRID BLACKOUT', desc: 'Interconnection severed; islanded', color: 'from-purple-900 to-fuchsia-950' },
  ];

  return (
    <div className="space-y-4">
      {/* Emergency Event Injector Buttons */}
      <div className="p-4 rounded-xl glass-panel border border-red-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-200">
              ONE-CLICK EMERGENCY CONTINGENCY INJECTION
            </h3>
          </div>
          <button
            onClick={() => onTriggerEmergency('CLEAR')}
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Clear Emergencies
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {emergencyEvents.map(ev => (
            <button
              key={ev.id}
              onClick={() => onTriggerEmergency(ev.id)}
              className="p-2.5 rounded-lg text-left bg-gradient-to-br border border-slate-700/80 hover:border-red-400/80 transition-all hover:scale-102 active:scale-98 shadow-md"
            >
              <span className="font-bold text-xs text-white block truncate">{ev.label}</span>
              <span className="text-[10px] text-slate-300 block line-clamp-1 mt-0.5">{ev.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive What-If Disturbance Sliders */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-200">
              WHAT-IF CONTINUOUS DISTURBANCE CONTROLS
            </h3>
          </div>
          <button
            onClick={handleResetSliders}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All Sliders
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Solar Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Solar Resource Multiplier
              </span>
              <span className="font-mono text-cyan-300 font-bold">{(solarScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={solarScale}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSolarScale(val);
                applyChanges({ solar: val });
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Eclipse)</span>
              <span>100% (Normal)</span>
              <span>150% (Surplus)</span>
            </div>
          </div>

          {/* Wind Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                Wind Velocity Multiplier
              </span>
              <span className="font-mono text-cyan-300 font-bold">{(windScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={windScale}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWindScale(val);
                applyChanges({ wind: val });
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Calm)</span>
              <span>100% (Normal)</span>
              <span>150% (Gale)</span>
            </div>
          </div>

          {/* Demand Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Demand Load Multiplier
              </span>
              <span className="font-mono text-amber-300 font-bold">{(demandScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.05"
              value={demandScale}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setDemandScale(val);
                applyChanges({ demand: val });
              }}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>60% (Off-Peak)</span>
              <span>100% (Design)</span>
              <span>150% (Stress)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Availability Force-Trip Toggles */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 mb-3 flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5 text-cyan-400" />
          Asset Breaker & Availability Isolation Switches
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* G1 */}
          <button
            onClick={() => {
              const next = !g1Avail;
              setG1Avail(next);
              applyChanges({ g1: next });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              g1Avail
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <span className="font-bold text-xs block">G1 Base CCGT</span>
            <span className="text-[10px] font-mono mt-1 block">
              {g1Avail ? '● ENERGIZED' : '✕ ISOLATED'}
            </span>
          </button>

          {/* G2 */}
          <button
            onClick={() => {
              const next = !g2Avail;
              setG2Avail(next);
              applyChanges({ g2: next });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              g2Avail
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <span className="font-bold text-xs block">G2 Inter. Gas</span>
            <span className="text-[10px] font-mono mt-1 block">
              {g2Avail ? '● ENERGIZED' : '✕ ISOLATED'}
            </span>
          </button>

          {/* G3 */}
          <button
            onClick={() => {
              const next = !g3Avail;
              setG3Avail(next);
              applyChanges({ g3: next });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              g3Avail
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <span className="font-bold text-xs block">G3 Peaker Gas</span>
            <span className="text-[10px] font-mono mt-1 block">
              {g3Avail ? '● ENERGIZED' : '✕ ISOLATED'}
            </span>
          </button>

          {/* Battery */}
          <button
            onClick={() => {
              const next = !battAvail;
              setBattAvail(next);
              applyChanges({ batt: next });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              battAvail
                ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <span className="font-bold text-xs block">BESS Storage</span>
            <span className="text-[10px] font-mono mt-1 block">
              {battAvail ? '● ONLINE' : '✕ DISCONNECTED'}
            </span>
          </button>

          {/* Grid Interconnect */}
          <button
            onClick={() => {
              const next = !gridAvail;
              setGridAvail(next);
              applyChanges({ grid: next });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              gridAvail
                ? 'bg-slate-900/90 border-purple-500/40 text-purple-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <span className="font-bold text-xs block">Regional Grid</span>
            <span className="text-[10px] font-mono mt-1 block">
              {gridAvail ? '● INTERCONNECTED' : '✕ ISLANDED'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
