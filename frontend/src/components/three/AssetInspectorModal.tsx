import React from 'react';
import { X, Zap, Shield, AlertTriangle, Activity, Settings2, Power } from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface AssetInspectorModalProps {
  assetType: string;
  assetData?: any;
  systemState: SystemStateResponse;
  onClose: () => void;
  onToggleTrip: (assetId: string) => void;
}

export const AssetInspectorModal: React.FC<AssetInspectorModalProps> = ({
  assetType,
  assetData,
  systemState,
  onClose,
  onToggleTrip
}) => {
  const { final_schedule, battery_state, telemetry, risk } = systemState;

  let title = "Asset Telemetry";
  let subtitle = "Microgrid Component";
  let currentMW = 0;
  let maxCapacityMW = 0;
  let status = "AVAILABLE";
  let details: { label: string; value: string }[] = [];
  let assetId = "";
  let isTripped = false;

  if (assetType === 'solar') {
    title = "Bifacial Solar PV Farm";
    subtitle = "Single-Axis Tracking Clean Photovoltaic Array";
    assetId = "SOLAR";
    currentMW = final_schedule.solar_mw;
    maxCapacityMW = 100;
    status = currentMW > 0.1 ? "AVAILABLE" : "LIMITED";
    details = [
      { label: "Solar Irradiance", value: `${telemetry.solar_irradiance_w_m2.toFixed(0)} W/m²` },
      { label: "Physical Potential", value: `${telemetry.solar_potential_mw.toFixed(1)} MW` },
      { label: "Curtailed Power", value: `${final_schedule.curtailment_mw.toFixed(1)} MW` },
      { label: "Operational Cost", value: "$2.00 / MWh (O&M)" },
      { label: "Carbon Emissions", value: "0.00 tCO2 / MWh" }
    ];
  } else if (assetType === 'wind') {
    title = "Offshore/Onshore Wind Farm";
    subtitle = "Direct-Drive Aerodynamic Turbine Array";
    assetId = "WIND";
    currentMW = final_schedule.wind_mw;
    maxCapacityMW = 80;
    status = currentMW > 0.1 ? "AVAILABLE" : "LIMITED";
    details = [
      { label: "Wind Velocity", value: `${telemetry.wind_speed_m_s.toFixed(1)} m/s` },
      { label: "Rotor Status", value: currentMW > 0.1 ? "Pitch Controlled (Synchronized)" : "Feathered / Cut-out" },
      { label: "Physical Potential", value: `${telemetry.wind_potential_mw.toFixed(1)} MW` },
      { label: "Operational Cost", value: "$3.00 / MWh (O&M)" },
      { label: "Carbon Emissions", value: "0.00 tCO2 / MWh" }
    ];
  } else if (assetType === 'battery') {
    title = battery_state.name;
    subtitle = "Grid-Forming Energy Storage System (BESS)";
    assetId = "BATTERY";
    isTripped = !battery_state.is_available || battery_state.forced_offline;
    currentMW = final_schedule.battery_discharge_mw > 0 ? final_schedule.battery_discharge_mw : -final_schedule.battery_charge_mw;
    maxCapacityMW = battery_state.max_discharge_mw;
    status = isTripped ? "UNAVAILABLE" : battery_state.status;
    details = [
      { label: "State of Charge (SOC)", value: `${battery_state.current_soc_pct.toFixed(1)}%` },
      { label: "Stored Energy", value: `${((battery_state.current_soc_pct / 100) * battery_state.capacity_mwh).toFixed(1)} / ${battery_state.capacity_mwh.toFixed(0)} MWh` },
      { label: "Operating Window", value: `[${battery_state.min_soc_pct.toFixed(0)}% - ${battery_state.max_soc_pct.toFixed(0)}%]` },
      { label: "Round-Trip Efficiency", value: `${(battery_state.charge_efficiency * battery_state.discharge_efficiency * 100).toFixed(1)}%` },
      { label: "Full Cycles Completed", value: `${battery_state.cycles_completed.toFixed(1)} eq. cycles` },
      { label: "Estimated Degradation", value: `${battery_state.degradation_pct.toFixed(3)}% SOH Loss` }
    ];
  } else if (assetType === 'generator') {
    const g = assetData || systemState.generators[0];
    title = g.name;
    subtitle = "Firm Dispatchable Thermal Unit";
    assetId = g.id;
    isTripped = !g.is_available || g.forced_offline;
    currentMW = g.id === "G1" ? final_schedule.g1_mw : (g.id === "G2" ? final_schedule.g2_mw : final_schedule.g3_mw);
    maxCapacityMW = g.max_mw;
    status = isTripped ? "UNAVAILABLE" : (currentMW > 0 ? "AVAILABLE" : "LIMITED");
    details = [
      { label: "Operating Range", value: `[${g.min_mw.toFixed(0)} - ${g.max_mw.toFixed(0)} MW]` },
      { label: "Maximum Ramp Rate", value: `±${g.ramp_rate_mw.toFixed(0)} MW/hr` },
      { label: "Marginal Fuel Cost", value: `$${g.cost_per_mwh.toFixed(2)} / MWh` },
      { label: "Emissions Factor", value: `${g.emission_factor_t_per_mwh.toFixed(2)} tCO2 / MWh` },
      { label: "Unit Commitment Status", value: currentMW > 0 ? "SYNCHRONIZED (ON)" : "STANDBY (OFF)" }
    ];
  } else if (assetType === 'substation') {
    title = systemState.grid_interconnect.name;
    subtitle = "Central 132/33 kV Step-Up Switchyard & Grid Tie";
    assetId = "GRID";
    isTripped = !systemState.grid_interconnect.is_available || systemState.grid_interconnect.forced_offline;
    currentMW = final_schedule.grid_import_mw > 0 ? final_schedule.grid_import_mw : -final_schedule.grid_export_mw;
    maxCapacityMW = systemState.grid_interconnect.max_import_mw;
    status = isTripped ? "UNAVAILABLE" : "AVAILABLE";
    details = [
      { label: "Import Headroom", value: `${systemState.grid_interconnect.max_import_mw.toFixed(0)} MW (Max Import)` },
      { label: "Export Headroom", value: `${systemState.grid_interconnect.max_export_mw.toFixed(0)} MW (Max Reverse)` },
      { label: "Spot Import Tariff", value: `$${systemState.grid_interconnect.cost_import_per_mwh.toFixed(2)} / MWh` },
      { label: "Wholesale Export Tariff", value: `$${systemState.grid_interconnect.revenue_export_per_mwh.toFixed(2)} / MWh` },
      { label: "Tie-Line Status", value: isTripped ? "ISLANDED (BREAKER OPEN)" : "ENERGIZED (CLOSED)" }
    ];
  } else if (assetType === 'load') {
    title = "Metropolitan Demand Center";
    subtitle = "Aggregated Urban Commercial, Industrial & Residential Feeder";
    currentMW = telemetry.base_demand_mw;
    maxCapacityMW = 240;
    status = "AVAILABLE";
    details = [
      { label: "Active Real Demand", value: `${telemetry.base_demand_mw.toFixed(1)} MW` },
      { label: "Peak Demand Envelope", value: "180.0 MW (Design Base)" },
      { label: "Power Factor", value: "0.98 Inductive (Compensated)" },
      { label: "Load Profile Phase", value: telemetry.timestamp_hour >= 18 ? "Evening Peak" : (telemetry.timestamp_hour >= 9 ? "Daytime Commercial" : "Night Base") }
    ];
  } else if (assetType === 'control_center') {
    title = "AI + Quantum Operations HQ";
    subtitle = "Central Supervisory Control and Decision Support Center";
    status = "AVAILABLE";
    details = [
      { label: "Active Optimization Stage", value: systemState.active_pipeline_stage },
      { label: "Quantum Solver Backend", value: systemState.quantum_solution.backend_details },
      { label: "Classical Optimizer", value: systemState.classical_solution.solver_type },
      { label: "Validation Status", value: systemState.validation.is_feasible ? "FEASIBLE (0 Violations)" : "INFEASIBLE (Audit Flagged)" },
      { label: "Simulated Time", value: `${telemetry.timestamp_hour.toFixed(1)}:00 hrs` }
    ];
  }

  return (
    <div className="absolute top-20 right-6 z-50 w-96 glass-panel rounded-xl shadow-2xl p-5 border border-cyan-500/30 text-slate-100 animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-700/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide text-slate-100">{title}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Status & MW Pill */}
      <div className="my-4 bg-slate-900/60 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Operating Output</span>
          <span className="text-xl font-bold font-mono text-cyan-300">
            {currentMW >= 0 ? `${currentMW.toFixed(1)} MW` : `${currentMW.toFixed(1)} MW (Absorbing)`}
          </span>
          {maxCapacityMW > 0 && (
            <span className="text-xs text-slate-500 ml-1.5 font-mono">/ {maxCapacityMW.toFixed(0)} MW Cap</span>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-block px-2.5 py-0.8 rounded text-[11px] font-semibold tracking-wide ${
            status === 'AVAILABLE'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              : status === 'LIMITED'
              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
              : 'bg-red-950/80 border border-red-500/40 text-red-300'
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Telemetry Detail Grid */}
      <div className="space-y-2 mb-4">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
            <span className="text-slate-400">{d.label}</span>
            <span className="font-mono text-slate-200 font-medium">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Emergency Trip / Restore Controls for controllable assets */}
      {assetId && ['G1', 'G2', 'G3', 'BATTERY', 'GRID'].includes(assetId) && (
        <div className="pt-2 border-t border-slate-800/60">
          <button
            onClick={() => onToggleTrip(assetId)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isTripped
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-red-600/80 hover:bg-red-600 text-white shadow-lg shadow-red-900/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isTripped ? `Restore & Re-energize ${assetId}` : `Simulate Emergency Trip on ${assetId}`}
          </button>
        </div>
      )}
    </div>
  );
};
