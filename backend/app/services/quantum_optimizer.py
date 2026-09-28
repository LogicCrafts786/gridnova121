import time
import math
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional
from app.models.schemas import (
    DispatchCandidate, QuantumOptimizerResult, QuantumBackend, OptimizationWeights,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry
)

class BaseQuantumBackend(ABC):
    """Modular interface for Quantum Backends (Simulated vs Real QPU)."""
    @abstractmethod
    def run_qubo(self, Q: np.ndarray, num_shots: int = 1024) -> Dict[str, float]:
        pass

class SimulatedQuantumAnnealingBackend(BaseQuantumBackend):
    """
    Simulated Hybrid Quantum Optimizer using Parameterized QAOA / SQA Statevector Sampler.
    Simulates transverse-field quantum annealing Hamiltonian dynamics on classical CPU.
    Clearly labeled: 'Quantum Backend: SIMULATED'
    """
    def __init__(self, p_steps: int = 3, gamma: float = 0.42, beta: float = 0.38):
        self.p_steps = p_steps
        self.gamma = gamma
        self.beta = beta

    def run_qubo(self, Q: np.ndarray, num_shots: int = 1024) -> Dict[str, float]:
        n = Q.shape[0] # 3 qubits for G1, G2, G3
        num_states = 1 << n # 8 states

        # Calculate diagonal energy H_C for each computational basis state |z>
        energies = np.zeros(num_states)
        for state_idx in range(num_states):
            # Extract bit vector
            bits = np.array([(state_idx >> (n - 1 - i)) & 1 for i in range(n)], dtype=float)
            # QUBO energy: x^T Q x
            energies[state_idx] = float(bits @ Q @ bits)

        # Apply QAOA-inspired adiabatic state evolution
        # Ground state initial superposition: |+>^{\otimes n}
        psi = np.ones(num_states, dtype=complex) / np.sqrt(num_states)

        # Apply alternating cost and mixer unitary operations
        for _ in range(self.p_steps):
            # U(C, gamma) = exp(-i * gamma * H_C)
            psi = psi * np.exp(-1j * self.gamma * energies)

            # U(B, beta) = exp(-i * beta * \sum X_i)
            # Mixer matrix for independent qubits
            for qubit in range(n):
                stride = 1 << (n - 1 - qubit)
                for i in range(0, num_states, 2 * stride):
                    for j in range(stride):
                        idx0 = i + j
                        idx1 = idx0 + stride
                        v0 = psi[idx0]
                        v1 = psi[idx1]
                        psi[idx0] = math.cos(self.beta) * v0 - 1j * math.sin(self.beta) * v1
                        psi[idx1] = -1j * math.sin(self.beta) * v0 + math.cos(self.beta) * v1

        # Calculate final quantum probability distribution
        probabilities = np.abs(psi) ** 2
        probabilities /= np.sum(probabilities)

        # Generate shot counts / frequency distribution
        bitstring_probs: Dict[str, float] = {}
        for state_idx in range(num_states):
            bitstr = format(state_idx, f'0{n}b')
            bitstring_probs[bitstr] = round(float(probabilities[state_idx]), 4)

        return bitstring_probs


class HybridQuantumOptimizer:
    """
    Hybrid Quantum Microgrid Optimizer.
    Solves discrete Unit Commitment combinatorial search space via QUBO Hamiltonian formulation,
    then pairs with continuous classical dispatch.
    """
    DISCLAIMER = "Quantum Backend: SIMULATED. Classical simulation runtime — not evidence of quantum hardware advantage."

    def __init__(self, backend: Optional[BaseQuantumBackend] = None):
        self.backend = backend or SimulatedQuantumAnnealingBackend()
        self.backend_type: QuantumBackend = "SIMULATED"

    def solve(
        self,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        weights: OptimizationWeights,
        reserve_requirement_mw: float = 25.0
    ) -> QuantumOptimizerResult:
        t0 = time.perf_counter()

        g_map = {g.id: g for g in generators}
        g1, g2, g3 = g_map["G1"], g_map["G2"], g_map["G3"]

        solar_avail = next((r.current_mw for r in renewables if "solar" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        wind_avail = next((r.current_mw for r in renewables if "wind" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        demand = telemetry.base_demand_mw

        # Thermal shortfall requirement
        batt_headroom = battery.max_discharge_mw if (battery.is_available and not battery.forced_offline and battery.current_soc_pct > battery.min_soc_pct) else 0.0
        grid_headroom = grid.max_import_mw if (grid.is_available and not grid.forced_offline) else 0.0
        target_thermal_mw = max(0.0, demand - (solar_avail + wind_avail) - (batt_headroom * 0.4) - (grid_headroom * 0.3))

        # Build 3x3 QUBO Matrix: H(u) = u^T Q u
        # Diagonal elements Q_ii: Linear generator commitment cost + startup + capacity bias
        # Off-diagonal elements Q_ij: Inter-generator coupling and reserve synergy
        Q = np.zeros((3, 3))
        
        # Penalties for offline units
        offline_penalty = 5000.0

        gen_list = [g1, g2, g3]
        for i, g in enumerate(gen_list):
            if not g.is_available or g.forced_offline:
                Q[i, i] += offline_penalty
            else:
                # Operational cost factor + emission weighting
                c_norm = (g.cost_per_mwh + weights.weight_co2 * g.emission_factor_t_per_mwh) * 0.4
                # Capacity deficit quadratic penalty: A * (P_max * u_i - target)^2
                cap_cost = 0.015 * ((g.max_mw - target_thermal_mw) ** 2)
                Q[i, i] += (c_norm + cap_cost)

        # Cross terms: Quadratic penalty for total generation mismatch
        # Penalty: lambda * ( \sum_i P_max_i u_i - target )^2
        # Expansion: lambda * ( \sum_i P_max_i^2 u_i^2 + 2 \sum_{i<j} P_max_i P_max_j u_i u_j - 2 target \sum P_max_i u_i )
        lam = 0.08
        for i in range(3):
            p_i = gen_list[i].max_mw if (gen_list[i].is_available and not gen_list[i].forced_offline) else 0.0
            Q[i, i] += lam * (p_i ** 2 - 2 * target_thermal_mw * p_i)
            for j in range(i + 1, 3):
                p_j = gen_list[j].max_mw if (gen_list[j].is_available and not gen_list[j].forced_offline) else 0.0
                coupling = 2.0 * lam * p_i * p_j
                Q[i, j] += coupling / 2.0
                Q[j, i] += coupling / 2.0

        # Sample QUBO on simulated quantum annealing backend
        bitstring_probs = self.backend.run_qubo(Q)

        # Sort candidate bitstrings by sampling probability
        sorted_candidates = sorted(bitstring_probs.items(), key=lambda kv: kv[1], reverse=True)
        best_bitstring = sorted_candidates[0][0]

        # Extract best bitstring decisions: u1, u2, u3
        u1 = int(best_bitstring[0])
        u2 = int(best_bitstring[1])
        u3 = int(best_bitstring[2])

        # Continuous Economic Dispatch for the quantum-selected commitment
        # Try to dispatch according to merit order (lowest marginal cost first)
        p_sol = solar_avail
        p_wnd = wind_avail
        residual_load = demand - (p_sol + p_wnd)

        # Battery dispatch logic
        p_ch = 0.0
        p_dis = 0.0
        curr_e = (battery.current_soc_pct / 100.0) * battery.capacity_mwh
        min_e = (battery.min_soc_pct / 100.0) * battery.capacity_mwh
        max_e = (battery.max_soc_pct / 100.0) * battery.capacity_mwh

        if residual_load < 0:
            # Renewable surplus -> Charge battery
            surplus = abs(residual_load)
            max_ch = min(battery.max_charge_mw, max(0.0, (max_e - curr_e) / battery.charge_efficiency)) if battery.is_available and not battery.forced_offline else 0.0
            p_ch = min(surplus, max_ch)
            residual_load += p_ch
        elif residual_load > 0 and battery.is_available and not battery.forced_offline:
            # Deficit -> Discharge battery if SOC allows
            max_dis = min(battery.max_discharge_mw, max(0.0, (curr_e - min_e) * battery.discharge_efficiency))
            p_dis = min(residual_load * 0.45, max_dis)
            residual_load -= p_dis

        # Thermal generator dispatch based on commitment
        p_g1 = 0.0
        p_g2 = 0.0
        p_g3 = 0.0

        if u1:
            p_g1 = min(g1.max_mw, max(g1.min_mw, residual_load * 0.55))
            residual_load -= p_g1
        if u2:
            p_g2 = min(g2.max_mw, max(g2.min_mw, residual_load * 0.65))
            residual_load -= p_g2
        if u3:
            p_g3 = min(g3.max_mw, max(g3.min_mw, residual_load))
            residual_load -= p_g3

        # Grid balancing
        p_imp = 0.0
        p_exp = 0.0
        p_curt = 0.0

        if residual_load > 0:
            grid_avail_imp = grid.max_import_mw if (grid.is_available and not grid.forced_offline) else 0.0
            p_imp = min(residual_load, grid_avail_imp)
            residual_load -= p_imp
        elif residual_load < 0:
            surplus = abs(residual_load)
            grid_avail_exp = grid.max_export_mw if (grid.is_available and not grid.forced_offline) else 0.0
            p_exp = min(surplus, grid_avail_exp)
            p_curt = surplus - p_exp
            residual_load = 0.0

        # Cost and Emissions calculations
        cost_usd = (
            p_g1 * g1.cost_per_mwh + p_g2 * g2.cost_per_mwh + p_g3 * g3.cost_per_mwh +
            p_imp * grid.cost_import_per_mwh - p_exp * grid.revenue_export_per_mwh +
            (u1 * 40.0 + u2 * 30.0 + u3 * 20.0)
        )
        co2_tons = (
            p_g1 * g1.emission_factor_t_per_mwh +
            p_g2 * g2.emission_factor_t_per_mwh +
            p_g3 * g3.emission_factor_t_per_mwh +
            p_imp * 0.40
        )
        renew_pct = ((p_sol + p_wnd - p_curt) / max(1.0, demand)) * 100.0
        upward_res = (u1 * g1.max_mw - p_g1) + (u2 * g2.max_mw - p_g2) + (u3 * g3.max_mw - p_g3)

        runtime = round((time.perf_counter() - t0) * 1000.0, 2)
        total_obj = (
            cost_usd +
            weights.weight_co2 * co2_tons +
            weights.weight_curtailment * p_curt +
            weights.weight_grid_dependency * p_imp
        )

        candidate = DispatchCandidate(
            solver_type="Hybrid Quantum QUBO / SQA (Transverse-Field Annealing Simulator)",
            g1_committed=bool(u1),
            g1_mw=round(p_g1, 2),
            g2_committed=bool(u2),
            g2_mw=round(p_g2, 2),
            g3_committed=bool(u3),
            g3_mw=round(p_g3, 2),
            solar_mw=round(p_sol, 2),
            wind_mw=round(p_wnd, 2),
            battery_charge_mw=round(p_ch, 2),
            battery_discharge_mw=round(p_dis, 2),
            grid_import_mw=round(p_imp, 2),
            grid_export_mw=round(p_exp, 2),
            curtailment_mw=round(p_curt, 2),
            total_cost_usd=round(cost_usd, 2),
            co2_emissions_tons=round(co2_tons, 2),
            renewable_utilization_pct=round(min(100.0, renew_pct), 1),
            reserve_margin_mw=round(upward_res, 1),
            is_feasible=True, # Will be verified by Classical Feasibility Validator
            violations=[],
            objective_value=round(total_obj, 2),
            runtime_ms=runtime
        )

        return QuantumOptimizerResult(
            backend=self.backend_type,
            backend_details="Statevector QAOA / QUBO Combinatorial Unit Commitment Simulator (3-qubit subspace)",
            variables_count=3,
            candidate_bitstrings=[{k: v} for k, v in sorted_candidates],
            best_bitstring=best_bitstring,
            objective_value=round(total_obj, 2),
            runtime_ms=runtime,
            candidate=candidate,
            disclaimer=self.DISCLAIMER
        )
