import time
import copy
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    SystemStateResponse, SystemTelemetry, ScenarioType, WhatIfOverrides,
    OptimizationWeights, GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    DispatchCandidate, ValidationResult, RepairResult, QuantumOptimizerResult,
    ClassicalVsQuantumComparison, ExplainabilityReport, ForecastResponse
)
from app.services.data_provider import SimulatedDataProvider
from app.services.forecaster import AIForecastingEngine
from app.services.risk_engine import RiskEngine
from app.services.resource_manager import ResourceManager
from app.services.classical_optimizer import ClassicalOptimizer
from app.services.quantum_optimizer import HybridQuantumOptimizer
from app.services.validator import ClassicalFeasibilityValidator
from app.services.repair_engine import ClassicalRepairEngine
from app.services.explainability import ExplainabilityEngine
from app.services.benchmark import BenchmarkService

class GridController:
    """
    Master Microgrid Controller orchestrating the end-to-end connected pipeline:
    DATA -> FORECAST -> UNCERTAINTY -> SCENARIOS -> RISK -> RESOURCE AVAILABILITY
    -> OPTIMIZATION -> QUANTUM -> VALIDATOR -> REPAIR -> SCHEDULE -> EXPLANATION
    """
    def __init__(self):
        self.data_provider = SimulatedDataProvider()
        self.forecaster = AIForecastingEngine()
        self.risk_engine = RiskEngine()
        self.classical_optimizer = ClassicalOptimizer()
        self.quantum_optimizer = HybridQuantumOptimizer()
        
        # System state
        self.current_hour: float = 14.0 # Default afternoon hour (peak solar)
        self.active_scenario: ScenarioType = "NORMAL"
        self.is_running: bool = False
        self.simulation_speed: float = 1.0 # hours per step
        self.overrides = WhatIfOverrides()
        self.weights = OptimizationWeights()

        # Asset inventory
        self.generators: List[GeneratorConfig] = [
            GeneratorConfig(
                id="G1",
                name="G1 (Base-load CCGT)",
                min_mw=20.0,
                max_mw=80.0,
                ramp_rate_mw=25.0,
                cost_per_mwh=35.0,
                emission_factor_t_per_mwh=0.72,
                is_available=True,
                current_mw=45.0,
                status="AVAILABLE"
            ),
            GeneratorConfig(
                id="G2",
                name="G2 (Intermediate Gas)",
                min_mw=10.0,
                max_mw=50.0,
                ramp_rate_mw=35.0,
                cost_per_mwh=52.0,
                emission_factor_t_per_mwh=0.58,
                is_available=True,
                current_mw=25.0,
                status="AVAILABLE"
            ),
            GeneratorConfig(
                id="G3",
                name="G3 (Fast-Start Peaker)",
                min_mw=5.0,
                max_mw=30.0,
                ramp_rate_mw=30.0,
                cost_per_mwh=85.0,
                emission_factor_t_per_mwh=0.45,
                is_available=True,
                current_mw=0.0,
                status="AVAILABLE"
            ),
        ]

        self.battery = BatteryConfig(
            id="BESS-1",
            name="Lithium Iron Phosphate (LFP) Grid BESS",
            capacity_mwh=200.0,
            current_soc_pct=65.0,
            min_soc_pct=20.0,
            max_soc_pct=90.0,
            max_charge_mw=50.0,
            max_discharge_mw=50.0,
            charge_efficiency=0.92,
            discharge_efficiency=0.92,
            is_available=True,
            degradation_pct=2.4,
            cycles_completed=142.0,
            status="AVAILABLE"
        )

        self.renewables: List[RenewableConfig] = [
            RenewableConfig(
                id="SOLAR-1",
                name="Solar PV Farm (Bifacial Single-Axis)",
                capacity_mw=100.0,
                is_available=True,
                current_mw=75.0,
                status="AVAILABLE"
            ),
            RenewableConfig(
                id="WIND-1",
                name="Wind Turbine Array (Direct-Drive DFIG)",
                capacity_mw=80.0,
                is_available=True,
                current_mw=40.0,
                status="AVAILABLE"
            )
        ]

        self.grid = GridInterconnectConfig(
            id="GRID-INTERCONNECT",
            name="132 kV Regional Grid Tie-Line",
            max_import_mw=60.0,
            max_export_mw=40.0,
            cost_import_per_mwh=75.0,
            revenue_export_per_mwh=30.0,
            is_available=True,
            status="AVAILABLE"
        )

        # Baseline schedule for Before/After comparison
        self.previous_schedule: Optional[DispatchCandidate] = DispatchCandidate(
            solver_type="Un-Optimized Heuristic / Legacy Baseline",
            g1_committed=True,
            g1_mw=45.0,
            g2_committed=True,
            g2_mw=25.0,
            g3_committed=True,
            g3_mw=12.0,
            solar_mw=65.0,
            wind_mw=18.0,
            battery_charge_mw=0.0,
            battery_discharge_mw=0.0,
            grid_import_mw=15.0,
            grid_export_mw=0.0,
            curtailment_mw=6.5,
            total_cost_usd=3820.0,
            co2_emissions_tons=54.2,
            renewable_utilization_pct=48.5,
            reserve_margin_mw=48.0,
            is_feasible=True,
            violations=[],
            objective_value=5120.0,
            runtime_ms=0.0
        )
        self.current_schedule: Optional[DispatchCandidate] = None
        self.last_status_message: str = "System synchronized and ready for optimization."

    def execute_pipeline(self) -> SystemStateResponse:
        """
        Executes the full connected pipeline from DATA to EXPLAINABLE SCHEDULE.
        Every calculation feeds directly into the next.
        """
        # Determine effective scenario
        effective_scenario = self.overrides.forced_scenario or self.active_scenario

        # 1. DATA TELEMETRY
        telemetry = self.data_provider.get_telemetry(
            self.current_hour,
            scenario=effective_scenario,
            overrides=self.overrides
        )

        # Synchronize asset availability with overrides
        self.generators[0].is_available = self.overrides.g1_available and not self.generators[0].forced_offline
        self.generators[1].is_available = self.overrides.g2_available and not self.generators[1].forced_offline
        self.generators[2].is_available = self.overrides.g3_available and not self.generators[2].forced_offline
        self.battery.is_available = self.overrides.battery_available and not self.battery.forced_offline
        self.grid.is_available = self.overrides.grid_available and not self.grid.forced_offline

        # Update renewable current potentials
        self.renewables[0].current_mw = telemetry.solar_potential_mw
        self.renewables[1].current_mw = telemetry.wind_potential_mw

        # 2. AI FORECAST + UNCERTAINTY
        forecast = self.forecaster.generate_24h_forecast(
            self.current_hour,
            scenario=effective_scenario,
            overrides=self.overrides
        )

        # 3. RESOURCE AVAILABILITY AUDIT
        avail_items = ResourceManager.evaluate_resources(
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            overrides=self.overrides
        )

        # 4. RISK ASSESSMENT
        # Initial risk assessment with nominal import estimate
        risk = self.risk_engine.evaluate_risks(
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            scheduled_grid_import_mw=15.0
        )

        # 5. CLASSICAL OPTIMIZATION (UC + ED + STORAGE)
        classical_candidate = self.classical_optimizer.solve(
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            weights=self.weights
        )

        # 6. HYBRID QUANTUM OPTIMIZATION (QUBO Combinatorial Solver)
        quantum_result = self.quantum_optimizer.solve(
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            weights=self.weights
        )

        # 7. CLASSICAL FEASIBILITY VALIDATION
        # Validate the quantum candidate against all 10 physical constraints
        validation = ClassicalFeasibilityValidator.validate(
            candidate=quantum_result.candidate,
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid
        )
        quantum_result.candidate.is_feasible = validation.is_feasible
        quantum_result.candidate.violations = validation.failed_reasons

        # 8. CLASSICAL REPAIR / REFINEMENT
        repair = ClassicalRepairEngine.repair(
            candidate=quantum_result.candidate,
            validation=validation,
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            weights=self.weights
        )

        # Physical capacity ceiling check
        max_possible_supply = (
            (self.generators[0].max_mw if self.generators[0].is_available and not self.generators[0].forced_offline else 0.0) +
            (self.generators[1].max_mw if self.generators[1].is_available and not self.generators[1].forced_offline else 0.0) +
            (self.generators[2].max_mw if self.generators[2].is_available and not self.generators[2].forced_offline else 0.0) +
            (telemetry.solar_potential_mw if self.renewables[0].is_available and not self.renewables[0].forced_offline else 0.0) +
            (telemetry.wind_potential_mw if self.renewables[1].is_available and not self.renewables[1].forced_offline else 0.0) +
            (min(self.battery.max_discharge_mw, max(0.0, ((self.battery.current_soc_pct - self.battery.min_soc_pct) / 100.0) * self.battery.capacity_mwh * self.battery.discharge_efficiency)) if self.battery.is_available and not self.battery.forced_offline else 0.0) +
            (self.grid.max_import_mw if self.grid.is_available and not self.grid.forced_offline else 0.0)
        )
        is_insufficient = (max_possible_supply < telemetry.base_demand_mw - 0.1)

        # 9. FINAL SAFE SCHEDULE SELECTION
        if is_insufficient:
            final_schedule = classical_candidate
            final_schedule.is_feasible = False
            final_schedule.violations = [f"Infeasible due to insufficient generation capacity (Max Available: {max_possible_supply:.1f} MW < Demand: {telemetry.base_demand_mw:.1f} MW)."]
            self.last_status_message = "Infeasible due to insufficient generation capacity."
        elif repair.post_repair_feasible:
            final_schedule = repair.repaired_candidate
            self.last_status_message = "Optimization completed — feasible schedule found."
        elif classical_candidate.is_feasible:
            final_schedule = classical_candidate
            self.last_status_message = "Optimization completed — feasible schedule found."
        else:
            final_schedule = classical_candidate # Infeasible indicator handled by UI
            self.last_status_message = "Infeasible due to insufficient generation capacity."

        # Update physical asset states to reflect final schedule
        for g in self.generators:
            if g.id == "G1":
                g.current_mw = final_schedule.g1_mw
                g.status = "AVAILABLE" if (final_schedule.g1_committed and g.is_available and not g.forced_offline) else ("LIMITED" if not final_schedule.g1_committed else "UNAVAILABLE")
            elif g.id == "G2":
                g.current_mw = final_schedule.g2_mw
                g.status = "AVAILABLE" if (final_schedule.g2_committed and g.is_available and not g.forced_offline) else ("LIMITED" if not final_schedule.g2_committed else "UNAVAILABLE")
            elif g.id == "G3":
                g.current_mw = final_schedule.g3_mw
                g.status = "AVAILABLE" if (final_schedule.g3_committed and g.is_available and not g.forced_offline) else ("LIMITED" if not final_schedule.g3_committed else "UNAVAILABLE")

        # Re-evaluate risk with actual scheduled grid import
        risk = self.risk_engine.evaluate_risks(
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            scheduled_grid_import_mw=final_schedule.grid_import_mw
        )

        # 10. CLASSICAL VS HYBRID QUANTUM BENCHMARK
        comparison = BenchmarkService.compare(
            scenario=effective_scenario,
            classical_sol=classical_candidate,
            quantum_result=quantum_result,
            repair_result=repair
        )

        # 11. EXPLAINABLE AI REPORT
        explanation = ExplainabilityEngine.generate_explanation(
            schedule=final_schedule,
            telemetry=telemetry,
            generators=self.generators,
            battery=self.battery,
            renewables=self.renewables,
            grid=self.grid,
            prev_schedule=self.previous_schedule
        )

        # Capture previous schedule before storing new schedule
        prev_to_return = copy.deepcopy(self.previous_schedule)
        self.current_schedule = copy.deepcopy(final_schedule)
        self.previous_schedule = copy.deepcopy(final_schedule)

        # Emergency flag check
        is_emergency = bool(self.overrides.emergency_event or effective_scenario == "EXTREME" or risk.is_emergency)
        emergency_label = self.overrides.emergency_event if self.overrides.emergency_event else ("EXTREME SCENARIO ACTIVE" if effective_scenario == "EXTREME" else ("SYSTEM CONTINGENCY ALERT" if risk.is_emergency else None))

        return SystemStateResponse(
            mode="DEMO / SIMULATION MODE",
            electrical_model="Simplified Demo Power Balance",
            timestamp_hour=round(self.current_hour, 2),
            active_scenario=effective_scenario,
            is_emergency=is_emergency,
            emergency_label=emergency_label,
            telemetry=telemetry,
            forecast=forecast,
            risk=risk,
            resource_availability=avail_items,
            battery_state=self.battery,
            generators=self.generators,
            renewables=self.renewables,
            grid_interconnect=self.grid,
            classical_solution=classical_candidate,
            quantum_solution=quantum_result,
            validation=validation,
            repair=repair,
            final_schedule=final_schedule,
            previous_schedule=prev_to_return,
            optimization_status_message=self.last_status_message,
            comparison=comparison,
            explanation=explanation,
            active_pipeline_stage="FINAL SCHEDULE DISPATCHED"
        )

    def reoptimize(self) -> SystemStateResponse:
        """
        Executes immediate re-optimization cycle:
        1. Captures current schedule as previous schedule for Before/After comparison.
        2. Advances battery dynamic state by 15-minute dispatch interval (0.25h) based on active transfer.
        3. Updates simulation clock slightly and runs full Hybrid Quantum QUBO optimization.
        4. Validates and classically repairs constraints.
        5. Sets optimization status message: 'Optimization completed — feasible schedule found.'
        """
        if self.current_schedule:
            self.previous_schedule = copy.deepcopy(self.current_schedule)
            # Advance battery slightly by 15-minute dispatch interval (0.25h)
            dt = 0.25
            delta_mwh = (self.current_schedule.battery_charge_mw * self.battery.charge_efficiency * dt) - \
                        (self.current_schedule.battery_discharge_mw / max(0.1, self.battery.discharge_efficiency) * dt)
            new_mwh = (self.battery.current_soc_pct / 100.0 * self.battery.capacity_mwh) + delta_mwh
            new_soc = max(self.battery.min_soc_pct, min(self.battery.max_soc_pct, (new_mwh / self.battery.capacity_mwh) * 100.0))
            self.battery.current_soc_pct = round(new_soc, 2)
            
            # Minor physical clock advance (0.1h ~ 6 minutes) to reflect dynamic operational step
            self.current_hour = round((self.current_hour + 0.1) % 24.0, 2)

        self.last_status_message = "Optimization completed — feasible schedule found."
        return self.execute_pipeline()

    def step_time(self, delta_hours: float = 1.0) -> SystemStateResponse:
        """
        Advances the simulated clock and dynamically updates battery SOC and degradation.
        """
        # First retrieve current schedule to calculate energy transfer
        prev_state = self.execute_pipeline()
        sched = prev_state.final_schedule

        # Battery update
        # dE = P_ch * eta_ch * dt - P_dis / eta_dis * dt
        dt = delta_hours
        delta_mwh = (sched.battery_charge_mw * self.battery.charge_efficiency * dt) - (sched.battery_discharge_mw / max(0.1, self.battery.discharge_efficiency) * dt)
        new_mwh = (self.battery.current_soc_pct / 100.0 * self.battery.capacity_mwh) + delta_mwh
        new_soc = max(self.battery.min_soc_pct, min(self.battery.max_soc_pct, (new_mwh / self.battery.capacity_mwh) * 100.0))
        self.battery.current_soc_pct = round(new_soc, 2)

        # Degradation estimation
        cycle_contrib = ((sched.battery_charge_mw + sched.battery_discharge_mw) * dt) / (2.0 * self.battery.capacity_mwh)
        self.battery.cycles_completed = round(self.battery.cycles_completed + cycle_contrib, 2)
        self.battery.degradation_pct = round(self.battery.degradation_pct + cycle_contrib * 0.0025, 3)

        # Advance hour
        self.current_hour = (self.current_hour + delta_hours) % 24.0

        return self.execute_pipeline()

    def reset_state(self):
        """Resets microgrid to default pristine state."""
        self.current_hour = 14.0
        self.active_scenario = "NORMAL"
        self.overrides = WhatIfOverrides()
        self.battery.current_soc_pct = 65.0
        for g in self.generators:
            g.is_available = True
            g.forced_offline = False
        self.battery.is_available = True
        self.battery.forced_offline = False
        self.grid.is_available = True
        self.grid.forced_offline = False
        for r in self.renewables:
            r.is_available = True
            r.forced_offline = False
