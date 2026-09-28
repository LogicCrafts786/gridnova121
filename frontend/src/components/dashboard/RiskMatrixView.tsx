import React from 'react';
import {
  AlertTriangle, ShieldAlert, CheckCircle, Flame, Battery, Cpu,
  Globe, AlertOctagon, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { SystemStateResponse, ScenarioType, RiskLevel } from '../../types/api';

interface RiskMatrixViewProps {
  systemState: SystemStateResponse;
  onSelectScenario: (scenario: ScenarioType) => void;
}

export const RiskMatrixView: React.FC<RiskMatrixViewProps> = ({
  systemState,
  onSelectScenario
}) => {
  const { risk, active_scenario } = systemState;

  const scenarios: { id: ScenarioType; label: string; desc: string }[] = [
    { id: 'NORMAL', label: 'NORMAL', desc: 'Standard diurnal profile; nominal renewables and expected demand' },
    { id: 'LOW', label: 'LOW RENEWABLES', desc: 'Dense overcast + stagnant winds (high thermal backup reliance)' },
    { id: 'HIGH', label: 'HIGH SURPLUS', desc: 'Peak irradiance + gusty winds (curtailment & storage saturation)' },
    { id: 'EXTREME', label: 'EXTREME / EMERGENCY', desc: 'Severe weather disturbance + demand spike + potential outages' },
  ];

  const getRiskIcon = (category: string) => {
    switch (category) {
      case 'Power Shortage': return AlertOctagon;
      case 'Renewable Curtailment': return Flame;
      case 'Reserve Shortage': return ShieldAlert;
      case 'Battery Shortage': return Battery;
      case 'Generator Availability': return Cpu;
      case 'Grid Dependency': return Globe;
      default: return AlertTriangle;
    }
  };

  const getRiskBadge = (level: RiskLevel) => {
    if (level === 'HIGH') {
      return 'bg-red-950/80 border-red-500/50 text-red-300';
    }
    if (level === 'MEDIUM') {
      return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
    }
    return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
  };

  return (
    <div className="space-y-4">
      {/* Scenario Selector Panel */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300">
              OPERATIONAL SCENARIO SELECTOR
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecting a scenario updates physical inputs and executes end-to-end re-optimization.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Active: {active_scenario}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {scenarios.map(sc => {
            const isSelected = active_scenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`p-3 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-900/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${
                    sc.id === 'EXTREME'
                      ? 'text-red-400'
                      : sc.id === 'HIGH'
                      ? 'text-teal-300'
                      : sc.id === 'LOW'
                      ? 'text-amber-300'
                      : 'text-slate-100'
                  }`}>
                    {sc.label}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {sc.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Risk Engine Assessment Header */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300">
              6-DIMENSIONAL PHYSICAL GRID RISK AUDIT
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Composite Risk Index: <b className="font-mono text-slate-100">{risk.overall_score_pct}%</b>
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getRiskBadge(risk.overall_level)}`}>
              {risk.overall_level} RISK
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-slate-500 mb-3 italic">
          "{risk.disclaimer}" All risk calculations evaluate real physical margins against statutory N-1 criteria.
        </p>

        {/* 6 Risk Dimension Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {risk.items.map((item, idx) => {
            const Icon = getRiskIcon(item.category);
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-xs text-slate-200">{item.category}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadge(item.level)}`}>
                      {item.level} ({item.score_pct.toFixed(0)}%)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                    <span className="text-cyan-400 font-semibold">Causal Rationale: </span>
                    {item.reason}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                  Trigger Threshold: {item.threshold_info}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
