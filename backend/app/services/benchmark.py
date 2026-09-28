from datetime import datetime
from app.models.schemas import (
    ClassicalVsQuantumComparison, DispatchCandidate, QuantumOptimizerResult,
    RepairResult, ScenarioType
)

class BenchmarkService:
    """
    Classical vs. Hybrid Quantum Comparative Benchmark Service.
    Compares exact solution metrics without declaring false quantum advantage.
    Explicitly labeled: 'Simulation runtime comparison — not evidence of quantum hardware advantage.'
    """
    DISCLAIMER = "Simulation runtime comparison — not evidence of quantum hardware advantage."

    @staticmethod
    def compare(
        scenario: ScenarioType,
        classical_sol: DispatchCandidate,
        quantum_result: QuantumOptimizerResult,
        repair_result: RepairResult
    ) -> ClassicalVsQuantumComparison:
        c_obj = classical_sol.objective_value
        q_candidate = repair_result.repaired_candidate if repair_result.repair_applied else quantum_result.candidate
        q_obj = q_candidate.objective_value

        delta_pct = 0.0
        if c_obj > 0:
            delta_pct = round(((q_obj - c_obj) / c_obj) * 100.0, 2)

        # Analyze nuances
        notes = []
        if abs(delta_pct) <= 2.0:
            notes.append("Hybrid quantum formulation converged to near-identical objective solution within ±2% of classical global optimum.")
        elif q_obj > c_obj:
            notes.append(f"Classical solver achieved slightly superior objective ({c_obj:.1f} vs {q_obj:.1f}) due to exact continuous LP relaxation.")
        else:
            notes.append(f"Hybrid quantum candidate achieved competitive objective ({q_obj:.1f} vs {c_obj:.1f}).")

        if repair_result.repair_applied:
            notes.append(f"Quantum candidate required classical repair for {len(repair_result.original_violations)} constraints before reaching feasibility.")
        else:
            notes.append("Quantum combinatorial candidate satisfied all physical constraints directly without repair.")

        return ClassicalVsQuantumComparison(
            scenario=scenario,
            timestamp=datetime.now().strftime("%H:%M:%S"),
            classical_objective=round(classical_sol.objective_value, 2),
            quantum_objective=round(q_obj, 2),
            classical_cost_usd=round(classical_sol.total_cost_usd, 2),
            quantum_cost_usd=round(q_candidate.total_cost_usd, 2),
            classical_co2_tons=round(classical_sol.co2_emissions_tons, 2),
            quantum_co2_tons=round(q_candidate.co2_emissions_tons, 2),
            classical_renewable_pct=round(classical_sol.renewable_utilization_pct, 1),
            quantum_renewable_pct=round(q_candidate.renewable_utilization_pct, 1),
            classical_runtime_ms=round(classical_sol.runtime_ms, 2),
            quantum_runtime_ms=round(quantum_result.runtime_ms, 2),
            classical_feasible=classical_sol.is_feasible,
            quantum_feasible_before_repair=quantum_result.candidate.is_feasible,
            quantum_feasible_after_repair=q_candidate.is_feasible,
            objective_delta_pct=delta_pct,
            analysis_notes=" ".join(notes),
            disclaimer=BenchmarkService.DISCLAIMER
        )
