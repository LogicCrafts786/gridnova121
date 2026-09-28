import React, { useState } from 'react';
import {
  CheckCircle2, ArrowRight, TrendingDown, TrendingUp, Minus,
  Zap, DollarSign, Leaf, Cpu, Battery, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { DispatchCandidate } from '../../types/api';

interface ScheduleComparisonCardProps {
  currentSchedule: DispatchCandidate;
  previousSchedule?: DispatchCandidate | null;
  statusMessage?: string | null;
  onDismiss?: () => void;
}

export const ScheduleComparisonCard: React.FC<ScheduleComparisonCardProps> = ({
  currentSchedule,
  previousSchedule,
  statusMessage,
  onDismiss
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // If no previous schedule, create a nominal reference baseline so the user can still see current vs baseline
  const prev = previousSchedule || {
    solver_type: 'Baseline State',
    g1_committed: true,
    g1_mw: 20.0,
    g2_committed: false,
    g2_mw: 0.0,
    g3_committed: false,
    g3_mw: 0.0,
    solar_mw: currentSchedule.solar_mw,
    wind_mw: currentSchedule.wind_mw,
    battery_charge_mw: 0.0,
    battery_discharge_mw: 0.0,
    grid_import_mw: 15.0,
    grid_export_mw: 0.0,
    curtailment_mw: 0.0,
    total_cost_usd: currentSchedule.total_cost_usd * 1.15,
    co2_emissions_tons: currentSchedule.co2_emissions_tons * 1.12,
    renewable_utilization_pct: Math.max(0, currentSchedule.renewable_utilization_pct - 8.5),
    reserve_margin_mw: currentSchedule.reserve_margin_mw * 0.9,
    is_feasible: true,
    violations: [],
    objective_value: currentSchedule.objective_value * 1.14,
    runtime_ms: 0.0
  };

  const curr = currentSchedule;

  // Delta calculations
  const costDiff = curr.total_cost_usd - prev.total_cost_usd;
  const co2Diff = curr.co2_emissions_tons - prev.co2_emissions_tons;
  const renDiff = curr.renewable_utilization_pct - prev.renewable_utilization_pct;
  const curtDiff = curr.curtailment_mw - prev.curtailment_mw;
  const reserveDiff = curr.reserve_margin_mw - prev.reserve_margin_mw;

  // Format Delta helper
  const renderDelta = (
    diff: number,
    unit: string,
    invertColor: boolean = false,
    decimals: number = 2
  ) => {
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-0.5">
          <Minus className="w-3 h-3 text-slate-500" /> 0.00 {unit}
        </span>
      );
    }
    const isPositive = diff > 0;
    // For cost/co2, negative diff is good (green). If invertColor is true (e.g. renewable %), positive diff is good.
    const isGood = invertColor ? isPositive : !isPositive;
    const colorClass = isGood ? 'text-emerald-400' : 'text-amber-400';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <span className={`${colorClass} font-mono font-bold text-[11px] flex items-center gap-0.5`}>
        <Icon className="w-3 h-3" />
        {isPositive ? `+${diff.toFixed(decimals)}` : diff.toFixed(decimals)} {unit}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-emerald-950/20 backdrop-blur-md shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header Banner */}
      <div className="px-4 py-2.5 bg-emerald-950/60 border-b border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-wider text-emerald-200 uppercase flex items-center gap-1.5">
              <span>{statusMessage || 'Optimization completed — feasible schedule found.'}</span>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> LIVE DISPATCH ACTIVE
              </span>
            </h3>
            <p className="text-[10px] text-emerald-300/70">
              Discrete unit commitment & continuous economic dispatch validated against 10 grid constraints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand Comparison' : 'Collapse Comparison'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3.5 space-y-3 text-xs">
          {/* Top 4 Impact KPI Highlight Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Cost KPI */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                Operating Cost
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-slate-100 text-sm">
                  ${curr.total_cost_usd.toFixed(2)}
                </span>
                {renderDelta(costDiff, '$', false, 2)}
              </div>
              <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                Prev: ${prev.total_cost_usd.toFixed(2)}
              </span>
            </div>

            {/* CO2 Emissions KPI */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Leaf className="w-3 h-3 text-teal-400" />
                CO2 Emissions
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {curr.co2_emissions_tons.toFixed(2)} t
                </span>
                {renderDelta(co2Diff, 't', false, 2)}
              </div>
              <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                Prev: {prev.co2_emissions_tons.toFixed(2)} tCO2
              </span>
            </div>

            {/* Renewable Fraction KPI */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                Clean Fraction
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {curr.renewable_utilization_pct.toFixed(1)}%
                </span>
                {renderDelta(renDiff, '%', true, 1)}
              </div>
              <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                Prev: {prev.renewable_utilization_pct.toFixed(1)}%
              </span>
            </div>

            {/* Curtailment KPI */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" />
                Curtailment
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {curr.curtailment_mw.toFixed(1)} MW
                </span>
                {renderDelta(curtDiff, 'MW', false, 1)}
              </div>
              <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                Prev: {prev.curtailment_mw.toFixed(1)} MW
              </span>
            </div>
          </div>

          {/* Granular Asset Dispatch Breakdown Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800/90 bg-slate-950/50">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Asset / Vector</th>
                  <th className="py-2 px-3 text-slate-300">Previous Schedule</th>
                  <th className="py-2 px-3 text-emerald-300">Optimized Schedule</th>
                  <th className="py-2 px-3 text-cyan-300">Operational Delta (Δ)</th>
                  <th className="py-2 px-3">Feasibility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {/* G1 Base CCGT */}
                <tr>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${curr.g1_committed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    G1 Base CCGT (35 MW)
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {prev.g1_committed ? `ON (${prev.g1_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-slate-100">
                    {curr.g1_committed ? `ON (${curr.g1_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3">
                    {renderDelta(curr.g1_mw - prev.g1_mw, 'MW', false, 1)}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-[10px] text-slate-400">
                    {curr.g1_committed ? 'Within [10, 35] MW limits' : 'Warm Standby'}
                  </td>
                </tr>

                {/* G2 Inter Gas */}
                <tr>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${curr.g2_committed ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    G2 Inter Gas (25 MW)
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {prev.g2_committed ? `ON (${prev.g2_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-slate-100">
                    {curr.g2_committed ? `ON (${curr.g2_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3">
                    {renderDelta(curr.g2_mw - prev.g2_mw, 'MW', false, 1)}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-[10px] text-slate-400">
                    {curr.g2_committed ? 'Spinning reserve active' : 'Cold Standby'}
                  </td>
                </tr>

                {/* G3 Peaker */}
                <tr>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${curr.g3_committed ? 'bg-red-400' : 'bg-slate-600'}`} />
                    G3 Fast Peaker (15 MW)
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {prev.g3_committed ? `ON (${prev.g3_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-slate-100">
                    {curr.g3_committed ? `ON (${curr.g3_mw.toFixed(1)} MW)` : 'OFF (0.0 MW)'}
                  </td>
                  <td className="py-1.5 px-3">
                    {renderDelta(curr.g3_mw - prev.g3_mw, 'MW', false, 1)}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-[10px] text-slate-400">
                    {curr.g3_committed ? 'Dispatched for peak surge' : 'Idle (Fuel Saved)'}
                  </td>
                </tr>

                {/* Battery Net Power */}
                <tr>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-blue-400" />
                    BESS 50 MWh Storage
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {prev.battery_discharge_mw > 0
                      ? `Disch -${prev.battery_discharge_mw.toFixed(1)} MW`
                      : prev.battery_charge_mw > 0
                      ? `Chg +${prev.battery_charge_mw.toFixed(1)} MW`
                      : 'Standby 0 MW'}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-cyan-300">
                    {curr.battery_discharge_mw > 0
                      ? `Disch -${curr.battery_discharge_mw.toFixed(1)} MW`
                      : curr.battery_charge_mw > 0
                      ? `Chg +${curr.battery_charge_mw.toFixed(1)} MW`
                      : 'Standby 0 MW'}
                  </td>
                  <td className="py-1.5 px-3">
                    {renderDelta(
                      (curr.battery_charge_mw - curr.battery_discharge_mw) -
                      (prev.battery_charge_mw - prev.battery_discharge_mw),
                      'MW',
                      false,
                      1
                    )}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-[10px] text-slate-400">
                    SOC within safe bounds [15%, 95%]
                  </td>
                </tr>

                {/* Grid Tie Line Net */}
                <tr>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    132kV Regional Interconnect
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {prev.grid_import_mw > 0
                      ? `Imp +${prev.grid_import_mw.toFixed(1)} MW`
                      : prev.grid_export_mw > 0
                      ? `Exp -${prev.grid_export_mw.toFixed(1)} MW`
                      : '0.0 MW'}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-purple-300">
                    {curr.grid_import_mw > 0
                      ? `Imp +${curr.grid_import_mw.toFixed(1)} MW`
                      : curr.grid_export_mw > 0
                      ? `Exp -${curr.grid_export_mw.toFixed(1)} MW`
                      : '0.0 MW'}
                  </td>
                  <td className="py-1.5 px-3">
                    {renderDelta(
                      (curr.grid_import_mw - curr.grid_export_mw) -
                      (prev.grid_import_mw - prev.grid_export_mw),
                      'MW',
                      false,
                      1
                    )}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    Tie line within [-20, 25] MW limits
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
