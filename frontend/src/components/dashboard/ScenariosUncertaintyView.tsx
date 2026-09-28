import React from 'react';
import { CloudSun, Wind, Zap, Layers, AlertCircle, ArrowRight } from 'lucide-react';
import { SystemStateResponse, ScenarioType } from '../../types/api';

interface ScenariosUncertaintyViewProps {
  systemState: SystemStateResponse;
  onSelectScenario: (scenario: ScenarioType) => void;
}

export const ScenariosUncertaintyView: React.FC<ScenariosUncertaintyViewProps> = ({
  systemState,
  onSelectScenario
}) => {
  const { active_scenario, telemetry } = systemState;

  // Derive scenario values based on current base readings
  const baseSolar = Math.max(10.0, telemetry.solar_potential_mw);
  const baseWind = Math.max(15.0, telemetry.wind_potential_mw);
  const baseDemand = telemetry.base_demand_mw;

  const scenariosData: {
    id: ScenarioType;
    label: string;
    solarRange: string;
    solarMW: number;
    windRange: string;
    windMW: number;
    demandRange: string;
    demandMW: number;
    uncertaintyPct: number;
    description: string;
    riskCategory: string;
  }[] = [
    {
      id: 'HIGH',
      label: 'HIGH Renewable Scenario',
      solarRange: `${(baseSolar * 1.30).toFixed(1)} MW (+30%)`,
      solarMW: baseSolar * 1.30,
      windRange: `${(baseWind * 1.35).toFixed(1)} MW (+35%)`,
      windMW: baseWind * 1.35,
      demandRange: `${(baseDemand * 0.88).toFixed(1)} MW (-12%)`,
      demandMW: baseDemand * 0.88,
      uncertaintyPct: 15,
      description: 'Optimal meteorological conditions with high solar irradiance, favorable wind shear, and mild temperature.',
      riskCategory: 'Low Curtailment Risk'
    },
    {
      id: 'NORMAL',
      label: 'MEDIUM / NORMAL Scenario (Nominal)',
      solarRange: `${baseSolar.toFixed(1)} MW (Expected)`,
      solarMW: baseSolar,
      windRange: `${baseWind.toFixed(1)} MW (Expected)`,
      windMW: baseWind,
      demandRange: `${baseDemand.toFixed(1)} MW (Standard)`,
      demandMW: baseDemand,
      uncertaintyPct: 8,
      description: 'Typical diurnal meteorological conditions matching historical day-ahead forecast expectations.',
      riskCategory: 'Nominal Operating Bounds'
    },
    {
      id: 'LOW',
      label: 'LOW Renewable Scenario',
      solarRange: `${(baseSolar * 0.45).toFixed(1)} MW (-55%)`,
      solarMW: baseSolar * 0.45,
      windRange: `${(baseWind * 0.40).toFixed(1)} MW (-60%)`,
      windMW: baseWind * 0.40,
      demandRange: `${(baseDemand * 1.25).toFixed(1)} MW (+25%)`,
      demandMW: baseDemand * 1.25,
      uncertaintyPct: 28,
      description: 'Cloud cover suppression, calm wind front, and elevated heating/cooling demand requiring thermal peaker commitment.',
      riskCategory: 'Elevated Supply Deficit Risk'
    },
    {
      id: 'EXTREME',
      label: 'EXTREME Shock Scenario',
      solarRange: `${(baseSolar * 0.20).toFixed(1)} MW (-80%)`,
      solarMW: baseSolar * 0.20,
      windRange: `${(baseWind * 0.25).toFixed(1)} MW (-75%)`,
      windMW: baseWind * 0.25,
      demandRange: `${(baseDemand * 1.40).toFixed(1)} MW (+40%)`,
      demandMW: baseDemand * 1.40,
      uncertaintyPct: 45,
      description: 'Severe weather disturbance compound event: rapid solar ramp-down, wind lull, and peak emergency demand surge.',
      riskCategory: 'Critical Spinning Reserve Alert'
    }
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full text-slate-100">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
          <Layers className="w-4 h-4 text-cyan-400" />
          Uncertainty Analysis & Multi-Scenario Generator
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Evaluate probabilistic renewable generation bands and demand uncertainty ranges. Switch scenarios to immediately re-calculate the entire optimization pipeline.
        </p>
      </div>

      {/* Current Active Scenario Badge */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Active Operational Scenario:</span>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-950 border border-cyan-500/50 text-cyan-300 tracking-wider">
            {active_scenario} SCENARIO
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Base Load: <strong className="text-amber-300">{telemetry.base_demand_mw.toFixed(1)} MW</strong>
        </span>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenariosData.map(sc => {
          const isActive = active_scenario === sc.id;
          return (
            <div
              key={sc.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900/90 border-cyan-500/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xs font-bold tracking-wide ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {sc.label}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    sc.id === 'HIGH' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                    sc.id === 'NORMAL' ? 'bg-blue-950/80 text-blue-300 border border-blue-800' :
                    sc.id === 'LOW' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                    'bg-red-950/80 text-red-300 border border-red-800'
                  }`}>
                    {sc.riskCategory}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {sc.description}
                </p>

                {/* Metric Ranges */}
                <div className="space-y-1.5 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <CloudSun className="w-3.5 h-3.5 text-yellow-400" /> Solar Potential:
                    </span>
                    <span className="font-mono font-bold text-yellow-300">{sc.solarRange}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Wind className="w-3.5 h-3.5 text-teal-400" /> Wind Potential:
                    </span>
                    <span className="font-mono font-bold text-teal-300">{sc.windRange}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> System Demand:
                    </span>
                    <span className="font-mono font-bold text-amber-300">{sc.demandRange}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectScenario(sc.id)}
                disabled={isActive}
                className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-cyan-700/50 text-cyan-200 cursor-default'
                    : 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white shadow'
                }`}
              >
                {isActive ? 'CURRENTLY ACTIVE' : 'ACTIVATE SCENARIO'}
                {!isActive && <ArrowRight className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
