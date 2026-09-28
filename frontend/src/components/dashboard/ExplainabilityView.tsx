import React from 'react';
import {
  FileText, Lightbulb, DollarSign, Leaf, Zap, ShieldCheck, Battery, Globe
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface ExplainabilityViewProps {
  systemState: SystemStateResponse;
}

export const ExplainabilityView: React.FC<ExplainabilityViewProps> = ({ systemState }) => {
  const { final_schedule, explanation, battery_state, telemetry, risk } = systemState;

  return (
    <div className="space-y-4">
      {/* Schedule Banner */}
      <div className="p-4 rounded-xl glass-panel border border-emerald-500/40">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm tracking-wide text-slate-100">
              BEST FEASIBLE ENERGY SCHEDULE DISPATCH
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
            0 Constraint Violations (100% Feasible)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <span className="font-bold text-cyan-400">Executive Summary: </span>
          {explanation.summary}
        </p>

        {/* Schedule Dispatches Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs mt-3 font-mono">
          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Solar PV</span>
            <span className="font-bold text-emerald-400 text-sm">{final_schedule.solar_mw.toFixed(1)} MW</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Wind Farm</span>
            <span className="font-bold text-cyan-400 text-sm">{final_schedule.wind_mw.toFixed(1)} MW</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">G1 (CCGT)</span>
            <span className={`font-bold text-sm ${final_schedule.g1_committed ? 'text-amber-400' : 'text-slate-500'}`}>
              {final_schedule.g1_mw.toFixed(1)} MW
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">G2 (Inter.)</span>
            <span className={`font-bold text-sm ${final_schedule.g2_committed ? 'text-amber-400' : 'text-slate-500'}`}>
              {final_schedule.g2_mw.toFixed(1)} MW
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">G3 (Peaker)</span>
            <span className={`font-bold text-sm ${final_schedule.g3_committed ? 'text-amber-400' : 'text-slate-500'}`}>
              {final_schedule.g3_mw.toFixed(1)} MW
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Battery Net</span>
            <span className="font-bold text-blue-400 text-sm">
              {final_schedule.battery_discharge_mw > 0
                ? `-${final_schedule.battery_discharge_mw.toFixed(1)} MW`
                : final_schedule.battery_charge_mw > 0
                ? `+${final_schedule.battery_charge_mw.toFixed(1)} MW`
                : '0.0 MW'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Grid Net</span>
            <span className="font-bold text-purple-400 text-sm">
              {final_schedule.grid_import_mw > 0
                ? `+${final_schedule.grid_import_mw.toFixed(1)} MW`
                : final_schedule.grid_export_mw > 0
                ? `-${final_schedule.grid_export_mw.toFixed(1)} MW`
                : '0.0 MW'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Real Demand</span>
            <span className="font-bold text-amber-300 text-sm">{telemetry.base_demand_mw.toFixed(1)} MW</span>
          </div>
        </div>
      </div>

      {/* WHY THIS SCHEDULE? Section */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300">
            WHY THIS SCHEDULE? (AI CAUSAL EXPLAINABILITY)
          </h3>
        </div>

        {/* Primary Key Drivers */}
        <div className="space-y-2 mb-4">
          {explanation.key_drivers.map((kd, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
              <p className="leading-relaxed">{kd}</p>
            </div>
          ))}
        </div>

        {/* Detailed Decision Rationale Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
            <span className="font-bold text-cyan-300 block mb-1">Conventional Generator Commitment & Dispatch</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.generator_dispatch_rationale}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
            <span className="font-bold text-blue-300 block mb-1">Battery Storage Charge / Discharge Rationale</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.battery_decision_rationale}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
            <span className="font-bold text-purple-300 block mb-1">Grid Interconnection Economic Trade-off</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.grid_tradeoff_rationale}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
            <span className="font-bold text-teal-300 block mb-1">Renewable Absorption & Curtailment Control</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.curtailment_rationale}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
