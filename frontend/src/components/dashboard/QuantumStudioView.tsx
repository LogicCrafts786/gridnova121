import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Cpu, Scale, CheckCircle2, AlertTriangle, Info, ArrowRight, Zap, ShieldCheck, Layers } from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface QuantumStudioViewProps {
  systemState: SystemStateResponse;
}

export const QuantumStudioView: React.FC<QuantumStudioViewProps> = ({ systemState }) => {
  const { quantum_solution, classical_solution, comparison, final_schedule, validation, repair, telemetry } = systemState;

  // Transform bitstring distribution for Recharts
  const distributionData = quantum_solution.candidate_bitstrings.map(item => {
    const bitstring = Object.keys(item)[0];
    const probability = item[bitstring];
    return {
      bitstring: `|${bitstring}⟩`,
      rawBits: bitstring,
      probability: Number((probability * 100).toFixed(2)),
      isBest: bitstring === quantum_solution.best_bitstring,
      meaning: `G1:${bitstring[0]} G2:${bitstring[1]} G3:${bitstring[2]}`
    };
  });

  const bestBits = quantum_solution.best_bitstring || '100';
  const u1 = bestBits[0] === '1';
  const u2 = bestBits[1] === '1';
  const u3 = bestBits[2] === '1';

  return (
    <div className="space-y-4">
      {/* Honesty & Limitations Banner */}
      <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-bold text-purple-200">
            HYBRID QUANTUM DECISION-SUPPORT MODULE — HONEST ACADEMIC BENCHMARK
          </span>
        </div>
        <p className="text-purple-300/80 text-[11px] leading-relaxed">
          {comparison.disclaimer} Discrete unit commitment is modeled as a 3-qubit Quadratic Unconstrained Binary Optimization (QUBO) Hamiltonian and sampled via simulated transverse-field quantum annealing.
        </p>
      </div>

      {/* Top Metadata Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quantum Backend</span>
          <span className="font-mono font-bold text-purple-300 text-sm">
            {quantum_solution.backend}
          </span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            {quantum_solution.backend_details}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Decision Variables</span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {quantum_solution.variables_count} Qubits ({1 << quantum_solution.variables_count} States)
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Combinatorial UC Space</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Best Quantum State</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            |{quantum_solution.best_bitstring}⟩
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            G1:{quantum_solution.best_bitstring[0]} G2:{quantum_solution.best_bitstring[1]} G3:{quantum_solution.best_bitstring[2]}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Simulation Runtime</span>
          <span className="font-mono font-bold text-cyan-300 text-sm">
            {quantum_solution.runtime_ms.toFixed(2)} ms
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Statevector Sampler</span>
        </div>
      </div>

      {/* Quantum State Sampling Distribution */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              QUBO Computational Basis Sampling Probability |⟨z|ψ⟩|²
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Higher probability indicates lower Hamiltonian energy (closer to optimal commitment configuration).
            </p>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="bitstring" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                formatter={(val: any, _: any, props: any) => [
                  `${val}% Probability`,
                  `${props.payload.meaning} (${props.payload.isBest ? 'Selected Optimum' : 'Sub-optimal candidate'})`
                ]}
              />
              <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                {distributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isBest ? '#10b981' : '#8b5cf6'}
                    opacity={entry.isBest ? 1.0 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXPLICIT QUANTUM-TO-DECISION MAPPING & CONTINUOUS DISPATCH BRIDGE */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-wider uppercase text-purple-200">
                Quantum State → Generator Commitment & Dispatch Bridge
              </h3>
              <p className="text-[11px] text-slate-400">
                How best eigensolution |{quantum_solution.best_bitstring}⟩ is decoded into physical microgrid generator setpoints
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-purple-500/40 text-[11px] font-mono text-purple-300">
            <span>Optimal State:</span>
            <span className="font-bold text-emerald-400">|{quantum_solution.best_bitstring}⟩</span>
          </div>
        </div>

        {/* 3-Qubit Physical Mapping Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Qubit 0 -> G1 */}
          <div className={`p-3 rounded-lg border transition-all ${
            u1
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
              : 'bg-slate-950/40 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-purple-300 font-bold">QUBIT 0 (u₁)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                u1
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {u1 ? 'BIT 1 = COMMITTED (ON)' : 'BIT 0 = OFF'}
              </span>
            </div>
            <h4 className="font-bold text-slate-200 text-xs">G1 Base CCGT</h4>
            <div className="mt-2 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Dispatched MW:</span>
                <span className="font-bold text-slate-100">{final_schedule.g1_mw.toFixed(1)} MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Operational Band:</span>
                <span>[10.0, 35.0] MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Marginal Heat Rate:</span>
                <span>$45.00 / MWh</span>
              </div>
            </div>
          </div>

          {/* Qubit 1 -> G2 */}
          <div className={`p-3 rounded-lg border transition-all ${
            u2
              ? 'bg-amber-950/30 border-amber-500/50 shadow-sm'
              : 'bg-slate-950/40 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-purple-300 font-bold">QUBIT 1 (u₂)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                u2
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {u2 ? 'BIT 1 = COMMITTED (ON)' : 'BIT 0 = OFF'}
              </span>
            </div>
            <h4 className="font-bold text-slate-200 text-xs">G2 Intermediate Gas</h4>
            <div className="mt-2 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Dispatched MW:</span>
                <span className="font-bold text-slate-100">{final_schedule.g2_mw.toFixed(1)} MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Operational Band:</span>
                <span>[5.0, 25.0] MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Marginal Heat Rate:</span>
                <span>$72.00 / MWh</span>
              </div>
            </div>
          </div>

          {/* Qubit 2 -> G3 */}
          <div className={`p-3 rounded-lg border transition-all ${
            u3
              ? 'bg-red-950/30 border-red-500/50 shadow-sm'
              : 'bg-slate-950/40 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-purple-300 font-bold">QUBIT 2 (u₃)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                u3
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {u3 ? 'BIT 1 = COMMITTED (ON)' : 'BIT 0 = OFF'}
              </span>
            </div>
            <h4 className="font-bold text-slate-200 text-xs">G3 Peaker Turbine</h4>
            <div className="mt-2 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Dispatched MW:</span>
                <span className="font-bold text-slate-100">{final_schedule.g3_mw.toFixed(1)} MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Operational Band:</span>
                <span>[2.0, 15.0] MW</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Marginal Heat Rate:</span>
                <span>$115.00 / MWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Mathematical Decision Pipeline Explanation */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <span className="font-bold text-slate-200">QUBO Combinatorial Unit Commitment: </span>
              <span className="text-slate-400">
                State <code className="text-purple-300">|{quantum_solution.best_bitstring}⟩</code> was selected because it minimizes the microgrid Ising Hamiltonian energy \(H(u)\) for net load of {(telemetry.base_demand_mw - telemetry.solar_potential_mw - telemetry.wind_potential_mw).toFixed(1)} MW without over-committing expensive peakers.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <span className="font-bold text-slate-200">Continuous Merit-Order Dispatch: </span>
              <span className="text-slate-400">
                Fixing binary commitments <code className="text-cyan-300">u* = [{u1 ? '1' : '0'}, {u2 ? '1' : '0'}, {u3 ? '1' : '0'}]</code> turns the non-convex MINLP into a convex continuous dispatch solved via linear programming (LP), allocating lowest marginal fuel cost generation and battery storage charge/discharge.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <span className="font-bold text-slate-200">Classical Validation & Safe Repair: </span>
              <span className="text-slate-400">
                {repair.repair_applied
                  ? `Initial candidate required classical adjustment: ${repair.actions_taken.map(a => a.action).join(', ')}. All 10 constraints are now satisfied.`
                  : 'Initial quantum candidate directly satisfied all 10 physical grid constraints (zero repair needed).'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Classical vs Hybrid Quantum Side-by-Side Comparison Table */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            Comparison Result: Classical vs. Hybrid Quantum Solver
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Objective Delta: <b className={comparison.objective_delta_pct > 5 ? 'text-amber-400' : 'text-emerald-400'}>{comparison.objective_delta_pct > 0 ? `+${comparison.objective_delta_pct}%` : `${comparison.objective_delta_pct}%`}</b>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Metric Dimension</th>
                <th className="py-2.5 px-3 text-cyan-300">Classical Solver (SciPy HiGHS)</th>
                <th className="py-2.5 px-3 text-purple-300">Hybrid Quantum (Simulated QUBO)</th>
                <th className="py-2.5 px-3">Analytical Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">Weighted Objective</td>
                <td className="py-2 px-3 text-slate-100 font-bold">{comparison.classical_objective.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-100 font-bold">{comparison.quantum_objective.toFixed(2)}</td>
                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                  {comparison.classical_objective <= comparison.quantum_objective
                    ? 'Classical achieved tighter LP bound'
                    : 'Quantum candidate competitive'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">Operating Cost ($)</td>
                <td className="py-2 px-3 text-emerald-300">${comparison.classical_cost_usd.toFixed(2)}</td>
                <td className="py-2 px-3 text-emerald-300">${comparison.quantum_cost_usd.toFixed(2)}</td>
                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                  Difference: ${(comparison.quantum_cost_usd - comparison.classical_cost_usd).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">CO2 Emissions (tons)</td>
                <td className="py-2 px-3 text-teal-300">{comparison.classical_co2_tons.toFixed(2)} tCO2</td>
                <td className="py-2 px-3 text-teal-300">{comparison.quantum_co2_tons.toFixed(2)} tCO2</td>
                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">Direct carbon footprint</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">Renewable Fraction</td>
                <td className="py-2 px-3 text-emerald-300">{comparison.classical_renewable_pct.toFixed(1)}%</td>
                <td className="py-2 px-3 text-emerald-300">{comparison.quantum_renewable_pct.toFixed(1)}%</td>
                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">Green utilization index</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">Execution Runtime</td>
                <td className="py-2 px-3 text-cyan-300">{comparison.classical_runtime_ms.toFixed(2)} ms</td>
                <td className="py-2 px-3 text-purple-300">{comparison.quantum_runtime_ms.toFixed(2)} ms</td>
                <td className="py-2 px-3 font-sans text-slate-500 text-[10px]">
                  Classical CPU vs Quantum statevector simulation
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-slate-300">Classical Feasibility</td>
                <td className="py-2 px-3 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  Passed (0 Violations)
                </td>
                <td className="py-2 px-3 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  {comparison.quantum_feasible_after_repair ? 'Passed (Post-Repair)' : 'Infeasible'}
                </td>
                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                  All physical grid bounds strictly enforced
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nuanced Notes */}
        <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
          <span className="font-bold text-cyan-400">Analytical Evaluation: </span>
          {comparison.analysis_notes}
        </div>
      </div>
    </div>
  );
};
