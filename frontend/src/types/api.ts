export type ResourceStatus = "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
export type ScenarioType = "LOW" | "NORMAL" | "HIGH" | "EXTREME";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type QuantumBackend = "SIMULATED" | "REAL";

export interface GeneratorConfig {
  id: string;
  name: string;
  min_mw: number;
  max_mw: number;
  ramp_rate_mw: number;
  cost_per_mwh: number;
  emission_factor_t_per_mwh: number;
  is_available: boolean;
  forced_offline: boolean;
  current_mw: number;
  status: ResourceStatus;
}

export interface BatteryConfig {
  id: string;
  name: string;
  capacity_mwh: number;
  current_soc_pct: number;
  min_soc_pct: number;
  max_soc_pct: number;
  max_charge_mw: number;
  max_discharge_mw: number;
  charge_efficiency: number;
  discharge_efficiency: number;
  is_available: boolean;
  forced_offline: boolean;
  status: ResourceStatus;
  degradation_pct: number;
  cycles_completed: number;
}

export interface RenewableConfig {
  id: string;
  name: string;
  capacity_mw: number;
  is_available: boolean;
  forced_offline: boolean;
  current_mw: number;
  status: ResourceStatus;
}

export interface GridInterconnectConfig {
  id: string;
  name: string;
  max_import_mw: number;
  max_export_mw: number;
  is_available: boolean;
  forced_offline: boolean;
  cost_import_per_mwh: number;
  revenue_export_per_mwh: number;
  status: ResourceStatus;
}

export interface SystemTelemetry {
  timestamp_hour: number;
  solar_irradiance_w_m2: number;
  wind_speed_m_s: number;
  temperature_c: number;
  solar_potential_mw: number;
  wind_potential_mw: number;
  base_demand_mw: number;
  active_scenario: ScenarioType;
}

export interface ForecastStep {
  hour: number;
  demand_expected_mw: number;
  demand_lower_mw: number;
  demand_upper_mw: number;
  solar_expected_mw: number;
  solar_lower_mw: number;
  solar_upper_mw: number;
  wind_expected_mw: number;
  wind_lower_mw: number;
  wind_upper_mw: number;
}

export interface ForecastResponse {
  horizon_hours: number;
  forecast_mode: string;
  confidence_score: number;
  mape_pct: number;
  steps: ForecastStep[];
}

export interface RiskItem {
  category: string;
  level: RiskLevel;
  score_pct: number;
  reason: string;
  threshold_info: string;
}

export interface RiskAssessment {
  overall_level: RiskLevel;
  overall_score_pct: number;
  items: RiskItem[];
  is_emergency: boolean;
  disclaimer: string;
}

export interface ResourceAvailabilityItem {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  max_capacity_mw: number;
  available_capacity_mw: number;
  current_output_mw: number;
  status: ResourceStatus;
  reason: string;
}

export interface OptimizationWeights {
  weight_cost: number;
  weight_co2: number;
  weight_curtailment: number;
  weight_risk: number;
  weight_grid_dependency: number;
}

export interface DispatchCandidate {
  solver_type: string;
  g1_committed: boolean;
  g1_mw: number;
  g2_committed: boolean;
  g2_mw: number;
  g3_committed: boolean;
  g3_mw: number;
  solar_mw: number;
  wind_mw: number;
  battery_charge_mw: number;
  battery_discharge_mw: number;
  grid_import_mw: number;
  grid_export_mw: number;
  curtailment_mw: number;
  total_cost_usd: number;
  co2_emissions_tons: number;
  renewable_utilization_pct: number;
  reserve_margin_mw: number;
  is_feasible: boolean;
  violations: string[];
  objective_value: number;
  runtime_ms: number;
}

export interface ConstraintCheck {
  name: string;
  satisfied: boolean;
  actual_value: string;
  limit_value: string;
  deviation?: string | null;
}

export interface ValidationResult {
  is_feasible: boolean;
  checks: ConstraintCheck[];
  failed_reasons: string[];
  max_imbalance_mw: number;
}

export interface RepairStep {
  action: string;
  before_value: string;
  after_value: string;
  rationale: string;
}

export interface RepairResult {
  repair_applied: boolean;
  original_violations: string[];
  actions_taken: RepairStep[];
  repaired_candidate: DispatchCandidate;
  post_repair_feasible: boolean;
}

export interface QuantumOptimizerResult {
  backend: QuantumBackend;
  backend_details: string;
  variables_count: number;
  candidate_bitstrings: Record<string, number>[];
  best_bitstring: string;
  objective_value: number;
  runtime_ms: number;
  candidate: DispatchCandidate;
  disclaimer: string;
}

export interface ClassicalVsQuantumComparison {
  scenario: ScenarioType;
  timestamp: string;
  classical_objective: number;
  quantum_objective: number;
  classical_cost_usd: number;
  quantum_cost_usd: number;
  classical_co2_tons: number;
  quantum_co2_tons: number;
  classical_renewable_pct: number;
  quantum_renewable_pct: number;
  classical_runtime_ms: number;
  quantum_runtime_ms: number;
  classical_feasible: boolean;
  quantum_feasible_before_repair: boolean;
  quantum_feasible_after_repair: boolean;
  objective_delta_pct: number;
  analysis_notes: string;
  disclaimer: string;
}

export interface ExplainabilityReport {
  summary: string;
  key_drivers: string[];
  battery_decision_rationale: string;
  generator_dispatch_rationale: string;
  grid_tradeoff_rationale: string;
  curtailment_rationale: string;
}

export interface WhatIfOverrides {
  solar_scaling_factor: number;
  wind_scaling_factor: number;
  demand_scaling_factor: number;
  g1_available: boolean;
  g2_available: boolean;
  g3_available: boolean;
  battery_available: boolean;
  grid_available: boolean;
  forced_scenario?: ScenarioType | null;
  emergency_event?: string | null;
}

export interface SystemStateResponse {
  mode: string;
  electrical_model: string;
  timestamp_hour: number;
  active_scenario: ScenarioType;
  is_emergency: boolean;
  emergency_label?: string | null;
  telemetry: SystemTelemetry;
  forecast: ForecastResponse;
  risk: RiskAssessment;
  resource_availability: ResourceAvailabilityItem[];
  battery_state: BatteryConfig;
  generators: GeneratorConfig[];
  renewables: RenewableConfig[];
  grid_interconnect: GridInterconnectConfig;
  classical_solution: DispatchCandidate;
  quantum_solution: QuantumOptimizerResult;
  validation: ValidationResult;
  repair: RepairResult;
  final_schedule: DispatchCandidate;
  comparison: ClassicalVsQuantumComparison;
  explanation: ExplainabilityReport;
  active_pipeline_stage: string;
  previous_schedule?: DispatchCandidate | null;
  optimization_status_message?: string | null;
}
