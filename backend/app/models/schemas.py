from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

# Operational Status
ResourceStatus = Literal["AVAILABLE", "LIMITED", "UNAVAILABLE"]
ScenarioType = Literal["LOW", "NORMAL", "HIGH", "EXTREME"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
QuantumBackend = Literal["SIMULATED", "REAL"]

class GeneratorConfig(BaseModel):
    id: str
    name: str
    min_mw: float
    max_mw: float
    ramp_rate_mw: float
    cost_per_mwh: float
    emission_factor_t_per_mwh: float  # tCO2/MWh
    is_available: bool = True
    forced_offline: bool = False
    current_mw: float = 0.0
    status: ResourceStatus = "AVAILABLE"

class BatteryConfig(BaseModel):
    id: str = "BESS-1"
    name: str = "Grid Battery Storage"
    capacity_mwh: float = 200.0
    current_soc_pct: float = 65.0
    min_soc_pct: float = 20.0
    max_soc_pct: float = 90.0
    max_charge_mw: float = 50.0
    max_discharge_mw: float = 50.0
    charge_efficiency: float = 0.92
    discharge_efficiency: float = 0.92
    is_available: bool = True
    forced_offline: bool = False
    status: ResourceStatus = "AVAILABLE"
    degradation_pct: float = 2.4
    cycles_completed: float = 142.0

class RenewableConfig(BaseModel):
    id: str
    name: str
    capacity_mw: float
    is_available: bool = True
    forced_offline: bool = False
    current_mw: float = 0.0
    status: ResourceStatus = "AVAILABLE"

class GridInterconnectConfig(BaseModel):
    id: str = "GRID-INTERCONNECT"
    name: str = "Regional Main Grid Interconnection"
    max_import_mw: float = 60.0
    max_export_mw: float = 40.0
    is_available: bool = True
    forced_offline: bool = False
    cost_import_per_mwh: float = 75.0
    revenue_export_per_mwh: float = 30.0
    status: ResourceStatus = "AVAILABLE"

class SystemTelemetry(BaseModel):
    timestamp_hour: float  # 0 to 24
    solar_irradiance_w_m2: float
    wind_speed_m_s: float
    temperature_c: float
    solar_potential_mw: float
    wind_potential_mw: float
    base_demand_mw: float
    active_scenario: ScenarioType = "NORMAL"

class ForecastStep(BaseModel):
    hour: int
    demand_expected_mw: float
    demand_lower_mw: float
    demand_upper_mw: float
    solar_expected_mw: float
    solar_lower_mw: float
    solar_upper_mw: float
    wind_expected_mw: float
    wind_lower_mw: float
    wind_upper_mw: float

class ForecastResponse(BaseModel):
    horizon_hours: int = 24
    forecast_mode: str = "DEMO (Physics-Informed ML Regression with Residual Noise)"
    confidence_score: float
    mape_pct: float
    steps: List[ForecastStep]

class RiskItem(BaseModel):
    category: str
    level: RiskLevel
    score_pct: float
    reason: str
    threshold_info: str

class RiskAssessment(BaseModel):
    overall_level: RiskLevel
    overall_score_pct: float
    items: List[RiskItem]
    is_emergency: bool = False
    disclaimer: str = "Risk thresholds are DEMO assumptions for decision-support."

class ResourceAvailabilityItem(BaseModel):
    resource_id: str
    resource_name: str
    resource_type: str
    max_capacity_mw: float
    available_capacity_mw: float
    current_output_mw: float
    status: ResourceStatus
    reason: str

class OptimizationWeights(BaseModel):
    weight_cost: float = 1.0
    weight_co2: float = 15.0         # $ per tCO2
    weight_curtailment: float = 50.0 # $ per curtailed MWh
    weight_risk: float = 25.0
    weight_grid_dependency: float = 10.0

class DispatchCandidate(BaseModel):
    solver_type: str
    g1_committed: bool
    g1_mw: float
    g2_committed: bool
    g2_mw: float
    g3_committed: bool
    g3_mw: float
    solar_mw: float
    wind_mw: float
    battery_charge_mw: float
    battery_discharge_mw: float
    grid_import_mw: float
    grid_export_mw: float
    curtailment_mw: float
    total_cost_usd: float
    co2_emissions_tons: float
    renewable_utilization_pct: float
    reserve_margin_mw: float
    is_feasible: bool
    violations: List[str] = []
    objective_value: float
    runtime_ms: float

class ConstraintCheck(BaseModel):
    name: str
    satisfied: bool
    actual_value: str
    limit_value: str
    deviation: Optional[str] = None

class ValidationResult(BaseModel):
    is_feasible: bool
    checks: List[ConstraintCheck]
    failed_reasons: List[str]
    max_imbalance_mw: float

class RepairStep(BaseModel):
    action: str
    before_value: str
    after_value: str
    rationale: str

class RepairResult(BaseModel):
    repair_applied: bool
    original_violations: List[str]
    actions_taken: List[RepairStep]
    repaired_candidate: DispatchCandidate
    post_repair_feasible: bool

class QuantumOptimizerResult(BaseModel):
    backend: QuantumBackend = "SIMULATED"
    backend_details: str = "Statevector QAOA / QUBO Combinatorial Unit Commitment Simulator"
    variables_count: int
    candidate_bitstrings: List[Dict[str, float]] # bitstring -> probability/energy
    best_bitstring: str
    objective_value: float
    runtime_ms: float
    candidate: DispatchCandidate
    disclaimer: str = "Quantum Backend: SIMULATED. Classical simulation runtime — not evidence of quantum hardware advantage."

class ClassicalVsQuantumComparison(BaseModel):
    scenario: ScenarioType
    timestamp: str
    classical_objective: float
    quantum_objective: float
    classical_cost_usd: float
    quantum_cost_usd: float
    classical_co2_tons: float
    quantum_co2_tons: float
    classical_renewable_pct: float
    quantum_renewable_pct: float
    classical_runtime_ms: float
    quantum_runtime_ms: float
    classical_feasible: bool
    quantum_feasible_before_repair: bool
    quantum_feasible_after_repair: bool
    objective_delta_pct: float
    analysis_notes: str
    disclaimer: str = "Simulation runtime comparison — not evidence of quantum hardware advantage."

class ExplainabilityReport(BaseModel):
    summary: str
    key_drivers: List[str]
    battery_decision_rationale: str
    generator_dispatch_rationale: str
    grid_tradeoff_rationale: str
    curtailment_rationale: str

class WhatIfOverrides(BaseModel):
    solar_scaling_factor: float = 1.0     # 0.0 to 1.5
    wind_scaling_factor: float = 1.0      # 0.0 to 1.5
    demand_scaling_factor: float = 1.0    # 0.5 to 1.5
    g1_available: bool = True
    g2_available: bool = True
    g3_available: bool = True
    battery_available: bool = True
    grid_available: bool = True
    forced_scenario: Optional[ScenarioType] = None
    emergency_event: Optional[str] = None

class SystemStateResponse(BaseModel):
    mode: str = "DEMO / SIMULATION MODE"
    electrical_model: str = "Simplified Demo Power Balance"
    timestamp_hour: float
    active_scenario: ScenarioType
    is_emergency: bool
    emergency_label: Optional[str]
    telemetry: SystemTelemetry
    forecast: ForecastResponse
    risk: RiskAssessment
    resource_availability: List[ResourceAvailabilityItem]
    battery_state: BatteryConfig
    generators: List[GeneratorConfig]
    renewables: List[RenewableConfig]
    grid_interconnect: GridInterconnectConfig
    classical_solution: DispatchCandidate
    quantum_solution: QuantumOptimizerResult
    validation: ValidationResult
    repair: RepairResult
    final_schedule: DispatchCandidate
    comparison: ClassicalVsQuantumComparison
    explanation: ExplainabilityReport
    active_pipeline_stage: str
    previous_schedule: Optional[DispatchCandidate] = None
    optimization_status_message: Optional[str] = "Optimization completed — feasible schedule found."
