import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { Zap, Battery, Cpu, Activity, ShieldCheck, Sun, Wind, Flame } from 'lucide-react';
import { SystemStateResponse } from '../../types/api';
import { ScheduleComparisonCard } from './ScheduleComparisonCard';

interface LiveStatusViewProps {
  systemState: SystemStateResponse;
  onSelectAsset?: (assetType: string, assetData?: any) => void;
}

export const LiveStatusView: React.FC<LiveStatusViewProps> = ({ systemState, onSelectAsset }) => {
  const { final_schedule, telemetry, resource_availability, battery_state, previous_schedule, optimization_status_message } = systemState;

  // Pie chart generation mix data
  const mixData = [
    { name: 'Solar PV', value: final_schedule.solar_mw, color: '#10b981' },
    { name: 'Wind Farm', value: final_schedule.wind_mw, color: '#06b6d4' },
    { name: 'G1 (Base Gas)', value: final_schedule.g1_mw, color: '#f59e0b' },
    { name: 'G2 (Inter. Gas)', value: final_schedule.g2_mw, color: '#f97316' },
    { name: 'G3 (Peaker)', value: final_schedule.g3_mw, color: '#ef4444' },
    { name: 'Battery Discharge', value: final_schedule.battery_discharge_mw, color: '#3b82f6' },
    { name: 'Grid Import', value: final_schedule.grid_import_mw, color: '#a855f7' },
  ].filter(d => d.value > 0.05);

  const totalInjections = (
    final_schedule.solar_mw +
    final_schedule.wind_mw +
    final_schedule.g1_mw +
    final_schedule.g2_mw +
    final_schedule.g3_mw +
    final_schedule.battery_discharge_mw +
    final_schedule.grid_import_mw
  );

  const totalWithdrawals = (
    telemetry.base_demand_mw +
    final_schedule.battery_charge_mw +
    final_schedule.grid_export_mw +
    final_schedule.curtailment_mw
  );

  return (
    <div className="space-y-4">
      {/* Before / After Schedule Comparison */}
      <ScheduleComparisonCard
        currentSchedule={final_schedule}
        previousSchedule={previous_schedule}
        statusMessage={optimization_status_message}
      />

      {/* Power Balance Formula Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            ELECTRICAL MODEL: SIMPLIFIED DEMO POWER BALANCE
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            Imbalance: {(totalInjections - totalWithdrawals).toFixed(2)} MW (Balanced)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <div>
            <span className="text-slate-400">Total Generation / Injections: </span>
            <span className="text-emerald-300 font-semibold">{totalInjections.toFixed(1)} MW</span>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Solar ({final_schedule.solar_mw.toFixed(1)}) + Wind ({final_schedule.wind_mw.toFixed(1)}) + G1..3 ({(final_schedule.g1_mw + final_schedule.g2_mw + final_schedule.g3_mw).toFixed(1)}) + Disch ({final_schedule.battery_discharge_mw.toFixed(1)}) + Imp ({final_schedule.grid_import_mw.toFixed(1)})
            </div>
          </div>
          <div>
            <span className="text-slate-400">Total Demand / Withdrawals: </span>
            <span className="text-amber-300 font-semibold">{totalWithdrawals.toFixed(1)} MW</span>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Load ({telemetry.base_demand_mw.toFixed(1)}) + Chg ({final_schedule.battery_charge_mw.toFixed(1)}) + Exp ({final_schedule.grid_export_mw.toFixed(1)}) + Curt ({final_schedule.curtailment_mw.toFixed(1)})
            </div>
          </div>
        </div>
      </div>

      {/* Generation Mix & Battery Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Generation Mix Donut */}
        <div className="lg:col-span-2 p-4 rounded-xl glass-panel border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Real-Time Generation & Supply Mix (MW)
            </h3>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {final_schedule.renewable_utilization_pct.toFixed(1)}% Clean Renewables
            </span>
          </div>

          <div className="h-48 w-full flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={mixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)} MW`, 'Dispatch']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend list */}
            <div className="w-[45%] pl-2 space-y-1 text-xs">
              {mixData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-300 truncate text-[11px]">{d.name}</span>
                  </div>
                  <span className="font-mono text-slate-100 font-semibold text-[11px]">
                    {d.value.toFixed(1)} MW
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Battery Telemetry Card */}
        <div className="p-4 rounded-xl glass-panel border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
              BESS Health & Telemetry
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {battery_state.current_soc_pct.toFixed(1)}% SOC
            </span>
          </div>

          {/* Progress bar */}
          <div className="my-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Min: {battery_state.min_soc_pct.toFixed(0)}%</span>
              <span className="font-mono font-bold text-slate-200">
                {((battery_state.current_soc_pct / 100) * battery_state.capacity_mwh).toFixed(1)} / {battery_state.capacity_mwh.toFixed(0)} MWh
              </span>
              <span>Max: {battery_state.max_soc_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  battery_state.current_soc_pct < 25
                    ? 'bg-red-500'
                    : battery_state.current_soc_pct < 50
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, battery_state.current_soc_pct))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block">Current Action</span>
              <span className="font-mono font-semibold text-slate-200">
                {final_schedule.battery_charge_mw > 0
                  ? `Charging +${final_schedule.battery_charge_mw.toFixed(1)} MW`
                  : final_schedule.battery_discharge_mw > 0
                  ? `Discharging -${final_schedule.battery_discharge_mw.toFixed(1)} MW`
                  : 'Standby / Idle'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">SOH Degradation</span>
              <span className="font-mono text-slate-300">{battery_state.degradation_pct.toFixed(3)}% Loss</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Resource Availability Table */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Live Resource Availability & Operational Readiness Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Resource</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Max Cap</th>
                <th className="py-2 px-3">Avail Cap</th>
                <th className="py-2 px-3">Current Dispatch</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Operational Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resource_availability.map((res, i) => (
                <tr
                  key={i}
                  onClick={() => onSelectAsset && onSelectAsset(res.resource_id.toLowerCase().includes('solar') ? 'solar' : res.resource_id.toLowerCase().includes('wind') ? 'wind' : res.resource_id.toLowerCase().includes('bess') ? 'battery' : res.resource_id.toLowerCase().includes('grid') ? 'substation' : 'generator')}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-3 font-semibold text-slate-200">{res.resource_name}</td>
                  <td className="py-2 px-3 text-slate-400">{res.resource_type}</td>
                  <td className="py-2 px-3 font-mono">{res.max_capacity_mw.toFixed(0)} MW</td>
                  <td className="py-2 px-3 font-mono text-cyan-300 font-medium">{res.available_capacity_mw.toFixed(1)} MW</td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-300">
                    {res.resource_id === 'G1' ? final_schedule.g1_mw.toFixed(1)
                      : res.resource_id === 'G2' ? final_schedule.g2_mw.toFixed(1)
                      : res.resource_id === 'G3' ? final_schedule.g3_mw.toFixed(1)
                      : res.resource_id.includes('SOLAR') ? final_schedule.solar_mw.toFixed(1)
                      : res.resource_id.includes('WIND') ? final_schedule.wind_mw.toFixed(1)
                      : res.resource_id.includes('BESS') ? (final_schedule.battery_discharge_mw > 0 ? `-${final_schedule.battery_discharge_mw.toFixed(1)}` : `+${final_schedule.battery_charge_mw.toFixed(1)}`)
                      : `${final_schedule.grid_import_mw > 0 ? `+${final_schedule.grid_import_mw.toFixed(1)}` : `-${final_schedule.grid_export_mw.toFixed(1)}`}`} MW
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      res.status === 'AVAILABLE'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : res.status === 'LIMITED'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                        : 'bg-red-950/80 text-red-300 border border-red-500/40'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400 truncate max-w-xs">{res.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
