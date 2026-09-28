import React from 'react';
import {
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2,
  Sun, Wind, Cpu, Battery, ShieldAlert, Zap
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface ResourceAvailabilityViewProps {
  systemState: SystemStateResponse;
  onToggleTrip: (assetId: string) => void;
}

export const ResourceAvailabilityView: React.FC<ResourceAvailabilityViewProps> = ({
  systemState,
  onToggleTrip
}) => {
  const { generators, battery_state, renewables, telemetry, final_schedule, grid_interconnect } = systemState;

  // Calculate total currently available generation capacity
  const solarAvail = renewables.find(r => r.id === 'SOLAR-1')?.is_available ? telemetry.solar_potential_mw : 0;
  const windAvail = renewables.find(r => r.id === 'WIND-1')?.is_available ? telemetry.wind_potential_mw : 0;
  const g1Avail = generators.find(g => g.id === 'G1')?.is_available ? 80.0 : 0;
  const g2Avail = generators.find(g => g.id === 'G2')?.is_available ? 50.0 : 0;
  const g3Avail = generators.find(g => g.id === 'G3')?.is_available ? 30.0 : 0;
  const batteryAvail = battery_state.is_available ? battery_state.max_discharge_mw : 0;
  const gridAvail = grid_interconnect.is_available ? grid_interconnect.max_import_mw : 0;

  const totalMaxCapacity = solarAvail + windAvail + g1Avail + g2Avail + g3Avail + batteryAvail + gridAvail;
  const currentDemand = telemetry.base_demand_mw;
  const isCapacitySufficient = totalMaxCapacity >= currentDemand;
  const capacityDeficit = Math.max(0, currentDemand - totalMaxCapacity);

  const assetList: {
    id: string;
    name: string;
    type: 'solar' | 'wind' | 'thermal' | 'battery';
    isAvailable: boolean;
    capacityText: string;
    dispatchedMW: number;
    icon: any;
  }[] = [
    {
      id: 'SOLAR',
      name: 'Solar PV Array (100 MW)',
      type: 'solar',
      isAvailable: renewables.find(r => r.id === 'SOLAR-1')?.is_available ?? true,
      capacityText: `Potential: ${telemetry.solar_potential_mw.toFixed(1)} MW`,
      dispatchedMW: final_schedule.solar_mw,
      icon: Sun
    },
    {
      id: 'WIND',
      name: 'Wind Turbine Farm (80 MW)',
      type: 'wind',
      isAvailable: renewables.find(r => r.id === 'WIND-1')?.is_available ?? true,
      capacityText: `Potential: ${telemetry.wind_potential_mw.toFixed(1)} MW`,
      dispatchedMW: final_schedule.wind_mw,
      icon: Wind
    },
    {
      id: 'G1',
      name: 'Generator G1 (Base-load CCGT)',
      type: 'thermal',
      isAvailable: generators.find(g => g.id === 'G1')?.is_available ?? true,
      capacityText: 'Capacity: 20 – 80 MW',
      dispatchedMW: final_schedule.g1_mw,
      icon: Cpu
    },
    {
      id: 'G2',
      name: 'Generator G2 (Intermediate Gas)',
      type: 'thermal',
      isAvailable: generators.find(g => g.id === 'G2')?.is_available ?? true,
      capacityText: 'Capacity: 10 – 50 MW',
      dispatchedMW: final_schedule.g2_mw,
      icon: Cpu
    },
    {
      id: 'G3',
      name: 'Generator G3 (Fast Peaker)',
      type: 'thermal',
      isAvailable: generators.find(g => g.id === 'G3')?.is_available ?? true,
      capacityText: 'Capacity: 5 – 30 MW',
      dispatchedMW: final_schedule.g3_mw,
      icon: Cpu
    },
    {
      id: 'BATTERY',
      name: 'BESS Battery Storage (200 MWh)',
      type: 'battery',
      isAvailable: battery_state.is_available,
      capacityText: `Capacity: ±${battery_state.max_discharge_mw} MW (SOC: ${battery_state.current_soc_pct.toFixed(0)}%)`,
      dispatchedMW: final_schedule.battery_discharge_mw - final_schedule.battery_charge_mw,
      icon: Battery
    }
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full text-slate-100">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          Resource Availability & Capacity Adequacy
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Toggle individual generators, renewables, or battery storage ON/OFF to test automated grid compensation, contingency rerouting, and capacity failure modes.
        </p>
      </div>

      {/* Critical Infeasibility Alert if Total Capacity < Demand */}
      {!isCapacitySufficient && (
        <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs flex items-start gap-2.5 animate-pulse shadow-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-extrabold uppercase tracking-wide text-red-300">
              Infeasible due to insufficient generation capacity
            </h3>
            <p className="text-[11px] text-red-300/90 leading-relaxed">
              Total available supply capacity ({totalMaxCapacity.toFixed(1)} MW) is lower than system demand ({currentDemand.toFixed(1)} MW).
              Generation shortfall: <strong>{capacityDeficit.toFixed(1)} MW</strong>. 
              The optimizer refuses to generate a fictitious schedule and flags this condition for human dispatcher intervention.
            </p>
          </div>
        </div>
      )}

      {/* Generation Adequacy Progress Meter */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-semibold">Total Available Supply vs. Demand:</span>
          <span className={`font-mono font-bold ${isCapacitySufficient ? 'text-emerald-300' : 'text-red-400'}`}>
            {totalMaxCapacity.toFixed(1)} MW / {currentDemand.toFixed(1)} MW ({((totalMaxCapacity / currentDemand) * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${isCapacitySufficient ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, (totalMaxCapacity / currentDemand) * 100)}%` }}
          />
        </div>
      </div>

      {/* Asset Switch List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {assetList.map(asset => {
          const Icon = asset.icon;
          return (
            <div
              key={asset.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                asset.isAvailable
                  ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  : 'bg-red-950/30 border-red-900/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  asset.isAvailable ? 'bg-slate-800 text-cyan-300' : 'bg-red-950 text-red-400 border border-red-800'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{asset.name}</h4>
                  <p className="text-[10px] text-slate-400">{asset.capacityText}</p>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    Dispatched: {asset.dispatchedMW >= 0 ? `${asset.dispatchedMW.toFixed(1)} MW` : `${Math.abs(asset.dispatchedMW).toFixed(1)} MW (Chg)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onToggleTrip(asset.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  asset.isAvailable
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                    : 'bg-red-950 text-red-300 border border-red-800 hover:bg-red-900'
                }`}
                title={asset.isAvailable ? `Force ${asset.name} Offline` : `Restore ${asset.name}`}
              >
                {asset.isAvailable ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                    <span>ONLINE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-red-400" />
                    <span>TRIPPED</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
