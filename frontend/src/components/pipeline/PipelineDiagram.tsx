import React, { useState } from 'react';
import {
  Database, LineChart, ShieldAlert, Layers, AlertTriangle, Cpu,
  CheckCircle2, Wrench, FileText, Box, Sliders, RefreshCw, X, ArrowRight
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface PipelineDiagramProps {
  systemState: SystemStateResponse;
  activeStageId?: string;
}

interface StageDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: any;
  color: string;
  formula: string;
  description: string;
  getInput: (state: SystemStateResponse) => Record<string, any>;
  getOutput: (state: SystemStateResponse) => Record<string, any>;
}

export const PipelineDiagram: React.FC<PipelineDiagramProps> = ({ systemState }) => {
  const [selectedStage, setSelectedStage] = useState<StageDefinition | null>(null);

  const stages: StageDefinition[] = [
    {
      id: 'data',
      name: 'Data Telemetry Feed',
      shortName: 'DATA',
      icon: Database,
      color: 'from-blue-600 to-cyan-600',
      formula: 'D(t) = f_{diurnal}(t) + \\epsilon, \\; G(t) = G_{max} \\max(0, \\sin(\\pi(t-6)/12))',
      description: 'Ingests simulated microgrid telemetry: solar irradiance, wind velocity, ambient temperature, baseline demand, and asset breaker states.',
      getInput: (s) => ({ hour: s.telemetry.timestamp_hour, scenario: s.active_scenario }),
      getOutput: (s) => ({
        solar_irradiance: `${s.telemetry.solar_irradiance_w_m2} W/m²`,
        wind_speed: `${s.telemetry.wind_speed_m_s} m/s`,
        base_demand: `${s.telemetry.base_demand_mw} MW`,
        temperature: `${s.telemetry.temperature_c} °C`
      })
    },
    {
      id: 'forecast',
      name: 'AI Forecasting Engine',
      shortName: 'AI FORECAST',
      icon: LineChart,
      color: 'from-cyan-600 to-teal-600',
      formula: '\\hat{y} = X(X^T X + \\lambda I)^{-1} X^T y \\quad \\text{(Tikhonov Ridge Regression)}',
      description: 'Machine learning model predicting 24-hour horizon trajectories for Solar, Wind, and Demand using harmonic diurnal time series features.',
      getInput: (s) => ({ features: 'Harmonic sine/cosine 24h, temp, wind speed', horizon_hours: 24 }),
      getOutput: (s) => ({
        mode: s.forecast.forecast_mode,
        confidence: `${(s.forecast.confidence_score * 100).toFixed(0)}%`,
        mape: `${s.forecast.mape_pct}%`,
        steps_count: s.forecast.steps.length
      })
    },
    {
      id: 'uncertainty',
      name: 'Forecast Uncertainty Engine',
      shortName: 'UNCERTAINTY',
      icon: ShieldAlert,
      color: 'from-teal-600 to-emerald-600',
      formula: '[P_{10}, P_{90}] = \\hat{y} \\pm z_{\\alpha} \\cdot \\sigma_0 \\sqrt{1 + 0.08 \\cdot \\Delta t}',
      description: 'Calculates 10th and 90th percentile prediction intervals expanding over the forecast horizon to capture meteorological and stochastic demand variance.',
      getInput: (s) => ({ expected_demand: `${s.telemetry.base_demand_mw} MW`, horizon_growth: '0.08 / step' }),
      getOutput: (s) => ({
        solar_spread: `[${s.forecast.steps[0]?.solar_lower_mw} - ${s.forecast.steps[0]?.solar_upper_mw}] MW`,
        wind_spread: `[${s.forecast.steps[0]?.wind_lower_mw} - ${s.forecast.steps[0]?.wind_upper_mw}] MW`,
        demand_spread: `[${s.forecast.steps[0]?.demand_lower_mw} - ${s.forecast.steps[0]?.demand_upper_mw}] MW`
      })
    },
    {
      id: 'scenarios',
      name: 'Scenario Generation Engine',
      shortName: 'SCENARIOS',
      icon: Layers,
      color: 'from-emerald-600 to-amber-600',
      formula: '\\omega \\in \\{\\text{LOW}, \\text{NORMAL}, \\text{HIGH}, \\text{EXTREME}\\}',
      description: 'Synthesizes 4 discrete operating scenarios modulating renewable availability coefficients and peak load multipliers for stress testing.',
      getInput: (s) => ({ active_scenario: s.active_scenario, emergency_flag: s.is_emergency }),
      getOutput: (s) => ({
        selected_scenario: s.active_scenario,
        solar_capacity_factor: s.active_scenario === 'LOW' ? '0.45' : s.active_scenario === 'HIGH' ? '1.30' : '1.00',
        demand_multiplier: s.active_scenario === 'LOW' ? '1.25' : s.active_scenario === 'EXTREME' ? '1.40' : '1.00'
      })
    },
    {
      id: 'risk',
      name: 'Risk Engine',
      shortName: 'RISK ANALYSIS',
      icon: AlertTriangle,
      color: 'from-amber-600 to-orange-600',
      formula: 'Risk = \\Phi(\\text{Margin}, \\text{Reserve}, \\text{Curtailment}, \\text{SOC}, \\text{LossOfN-1})',
      description: 'Evaluates 6 physical grid vulnerability dimensions with deterministic thresholds and explicit causal explanations.',
      getInput: (s) => ({ total_supply: 'Solar + Wind + Thermal + Battery + Grid', demand: s.telemetry.base_demand_mw }),
      getOutput: (s) => ({
        overall_level: s.risk.overall_level,
        overall_score: `${s.risk.overall_score_pct}%`,
        shortage_risk: s.risk.items[0]?.level,
        reserve_risk: s.risk.items[2]?.level,
        grid_dep_risk: s.risk.items[5]?.level
      })
    },
    {
      id: 'resources',
      name: 'Resource Manager',
      shortName: 'RESOURCES',
      icon: Box,
      color: 'from-orange-600 to-pink-600',
      formula: 'P_i^{max, avail} = P_i^{rated} \\cdot A_i \\cdot (1 - \\text{Trip}_i)',
      description: 'Audits live asset availability, technical limits, inverter trips, boiler min stable states, and SOC limits.',
      getInput: (s) => ({ units_audited: ['Solar', 'Wind', 'G1', 'G2', 'G3', 'BESS', 'Grid'] }),
      getOutput: (s) => ({
        available_assets: s.resource_availability.filter(r => r.status === 'AVAILABLE').length,
        limited_assets: s.resource_availability.filter(r => r.status === 'LIMITED').length,
        unavailable_assets: s.resource_availability.filter(r => r.status === 'UNAVAILABLE').length
      })
    },
    {
      id: 'classical_opt',
      name: 'Classical UC + ED + Storage',
      shortName: 'UC + ED + STORAGE',
      icon: Cpu,
      color: 'from-pink-600 to-purple-600',
      formula: '\\min \\sum (c_i P_i + c_0 u_i) + w_{co2} E + w_{curt} P_{curt} \\quad \\text{s.t.} \\; \\sum P_i = D',
      description: 'Solves Unit Commitment and continuous Economic Dispatch with storage charging/discharging using SciPy HiGHS simplex/interior-point solver.',
      getInput: (s) => ({ objective_weights: 'Cost, CO2, Curtailment, Reserve', reserve_req: '25.0 MW' }),
      getOutput: (s) => ({
        solver: s.classical_solution.solver_type,
        objective: s.classical_solution.objective_value,
        cost: `$${s.classical_solution.total_cost_usd}`,
        runtime: `${s.classical_solution.runtime_ms} ms`
      })
    },
    {
      id: 'quantum_opt',
      name: 'Hybrid Quantum Optimizer',
      shortName: 'HYBRID QUANTUM',
      icon: Cpu,
      color: 'from-purple-600 to-indigo-600',
      formula: 'H(u) = u^T Q u + A \\left(\\sum P_i^{max} u_i - P_{target}\\right)^2 \\quad \\text{(QUBO)}',
      description: 'Formulates discrete generator commitment as a QUBO Hamiltonian and samples bitstrings using simulated transverse-field quantum annealing.',
      getInput: (s) => ({ qubo_dim: '3x3 (G1, G2, G3 qubits)', target_thermal_mw: 'Dynamic load shortfall' }),
      getOutput: (s) => ({
        backend: s.quantum_solution.backend_details,
        best_bitstring: s.quantum_solution.best_bitstring,
        objective: s.quantum_solution.objective_value,
        runtime: `${s.quantum_solution.runtime_ms} ms (Simulated)`
      })
    },
    {
      id: 'validator',
      name: 'Classical Feasibility Validator',
      shortName: 'VALIDATION',
      icon: CheckCircle2,
      color: 'from-indigo-600 to-blue-600',
      formula: '\\forall c \\in \\mathcal{C}: \\quad g_c(x) \\le 0, \\quad h_c(x) = 0 \\pm \\epsilon',
      description: 'Rigorous classical validation against all 10 physical grid constraints (power balance, ramp, min/max, SOC, reserves, grid ratings).',
      getInput: (s) => ({ candidate_solver: s.quantum_solution.candidate.solver_type }),
      getOutput: (s) => ({
        is_feasible: s.validation.is_feasible ? 'FEASIBLE' : 'INFEASIBLE',
        checks_passed: `${s.validation.checks.filter(c => c.satisfied).length} / ${s.validation.checks.length}`,
        violations_count: s.validation.failed_reasons.length
      })
    },
    {
      id: 'repair',
      name: 'Classical Repair & Refinement',
      shortName: 'REPAIR',
      icon: Wrench,
      color: 'from-blue-600 to-cyan-600',
      formula: 'x^* = \\arg\\min_x \\|x - x_{quantum}\\|^2 \\quad \\text{s.t.} \\; x \\in \\mathcal{F}_{feasible}',
      description: 'Applies minimal-deviation quadratic projection to repair infeasible candidates and restore 100% feasibility.',
      getInput: (s) => ({ original_violations: s.repair.original_violations.length }),
      getOutput: (s) => ({
        repair_applied: s.repair.repair_applied ? 'Yes' : 'Not Needed',
        actions_count: s.repair.actions_taken.length,
        post_repair_feasible: s.repair.post_repair_feasible ? 'FEASIBLE (100%)' : 'FAIL'
      })
    },
    {
      id: 'final_schedule',
      name: 'Explainable Final Schedule',
      shortName: 'SCHEDULE',
      icon: FileText,
      color: 'from-cyan-600 to-teal-600',
      formula: 'P_{disp}^* = \\{P_{sol}, P_{wnd}, P_{g1}, P_{g2}, P_{g3}, P_{batt}, P_{grid}\\}',
      description: 'Validates final safe dispatch and synthesizes causal natural language explanations detailing why this schedule was selected.',
      getInput: (s) => ({ verified_feasible: s.final_schedule.is_feasible }),
      getOutput: (s) => ({
        cost: `$${s.final_schedule.total_cost_usd}`,
        co2: `${s.final_schedule.co2_emissions_tons} tCO2`,
        renewables: `${s.final_schedule.renewable_utilization_pct}%`,
        violations: s.final_schedule.violations.length
      })
    },
    {
      id: 'what_if',
      name: 'What-If Simulation Sandbox',
      shortName: 'WHAT-IF',
      icon: Sliders,
      color: 'from-teal-600 to-amber-600',
      formula: 'u_{what-if} = \\{k_{sol}, k_{wnd}, k_{dem}, \\text{Trip}_{gen}, \\text{Trip}_{batt}\\}',
      description: 'Interactive disturbance sliders and emergency injection buttons modifying state and triggering immediate pipeline recalculation.',
      getInput: (s) => ({ overrides_active: Boolean(s.telemetry) }),
      getOutput: (s) => ({
        active_emergency: s.emergency_label || 'None (Normal)',
        demand_scaling: '1.0x (Nominal)'
      })
    },
    {
      id: 'reopt',
      name: 'Real-Time Re-Optimization Loop',
      shortName: 'RE-OPTIMIZE',
      icon: RefreshCw,
      color: 'from-amber-600 to-purple-600',
      formula: 't \\leftarrow t + \\Delta t, \\quad SOC(t+1) = SOC(t) + \\frac{P_{ch}\\eta - P_{dis}/\\eta}{C} \\Delta t',
      description: 'Autonomous continuous or on-demand closed feedback loop updating battery SOC, weather, and demand state.',
      getInput: (s) => ({ current_hour: s.telemetry.timestamp_hour }),
      getOutput: (s) => ({
        battery_soc: `${s.battery_state.current_soc_pct.toFixed(1)}%`,
        next_cycle: 'Ready'
      })
    }
  ];

  return (
    <div className="w-full bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 select-none overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 shrink-0">
          CONNECTED PIPELINE:
        </span>

        {stages.map((st, i) => {
          const Icon = st.icon;
          return (
            <React.Fragment key={st.id}>
              <button
                onClick={() => setSelectedStage(st)}
                className={`group px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 ${
                  st.id === 'final_schedule'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    : st.id === 'quantum_opt'
                    ? 'bg-purple-950/90 border-purple-500/60 text-purple-200'
                    : 'bg-slate-900/90 border-slate-700/70 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200'
                }`}
                title={`Click to inspect ${st.name}`}
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
                <span className="tracking-wide text-[11px]">{st.shortName}</span>
              </button>
              {i < stages.length - 1 && (
                <span className="text-slate-600 text-xs px-0.5">→</span>
              )}
            </React.Fragment>
          );
        })}

        <span className="text-cyan-400 text-xs font-bold ml-1">↺</span>
      </div>

      {/* Deep-Dive Inspection Modal for Clicked Pipeline Stage */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl glass-panel rounded-2xl p-6 border border-cyan-500/40 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedStage.color} flex items-center justify-center shadow-lg`}>
                  <selectedStage.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{selectedStage.name}</h3>
                  <span className="text-xs text-cyan-400 font-mono">Stage ID: {selectedStage.id.toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {selectedStage.description}
            </p>

            {/* Mathematical Formulation */}
            <div className="my-3.5 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block mb-1">
                MATHEMATICAL FORMULATION
              </span>
              <code className="text-xs font-mono text-cyan-300 block overflow-x-auto">
                {selectedStage.formula}
              </code>
            </div>

            {/* Live Inputs & Outputs Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              {/* Inputs */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                  CURRENT STAGE INPUTS
                </span>
                <div className="space-y-1 font-mono text-slate-300 text-[11px]">
                  {Object.entries(selectedStage.getInput(systemState)).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}:</span>
                      <span className="text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1.5">
                  CALCULATED OUTPUTS
                </span>
                <div className="space-y-1 font-mono text-slate-300 text-[11px]">
                  {Object.entries(selectedStage.getOutput(systemState)).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}:</span>
                      <span className="text-emerald-300 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Connected Pipeline Node Active
              </span>
              <button
                onClick={() => setSelectedStage(null)}
                className="px-4 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition-all text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
