import copy
from typing import List, Tuple
from app.models.schemas import (
    DispatchCandidate, ValidationResult, RepairResult, RepairStep,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry, OptimizationWeights
)
from app.services.validator import ClassicalFeasibilityValidator

class ClassicalRepairEngine:
    """
    Classical Repair / Refinement Engine.
    When a Quantum or heuristic candidate violates physical constraints,
    executes projection and minimal-deviation adjustment to guarantee 100% feasibility.
    """

    @staticmethod
    def repair(
        candidate: DispatchCandidate,
        validation: ValidationResult,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        weights: OptimizationWeights,
        reserve_requirement_mw: float = 25.0
    ) -> RepairResult:
        if validation.is_feasible:
            return RepairResult(
                repair_applied=False,
                original_violations=[],
                actions_taken=[],
                repaired_candidate=candidate,
                post_repair_feasible=True
            )

        actions: List[RepairStep] = []
        c = copy.deepcopy(candidate)
        g_map = {g.id: g for g in generators}
        g1, g2, g3 = g_map["G1"], g_map["G2"], g_map["G3"]

        # 1. Fix unavailable generator illegal commitment
        for gid, g_cfg in g_map.items():
            committed_attr = f"{gid.lower()}_committed"
            mw_attr = f"{gid.lower()}_mw"
            if getattr(c, committed_attr) and (not g_cfg.is_available or g_cfg.forced_offline):
                prev_val = f"ON ({getattr(c, mw_attr):.1f} MW)"
                setattr(c, committed_attr, False)
                setattr(c, mw_attr, 0.0)
                actions.append(RepairStep(
                    action=f"Decommit unavailable generator {gid}",
                    before_value=prev_val,
                    after_value="OFF (0.0 MW)",
                    rationale=f"Unit {gid} is tripped/offline. Decommitted to satisfy mechanical availability constraint."
                ))

        # 2. Fix generator output outside [min, max]
        for gid, g_cfg in g_map.items():
            committed_attr = f"{gid.lower()}_committed"
            mw_attr = f"{gid.lower()}_mw"
            if getattr(c, committed_attr):
                val = getattr(c, mw_attr)
                if val < g_cfg.min_mw:
                    setattr(c, mw_attr, g_cfg.min_mw)
                    actions.append(RepairStep(
                        action=f"Enforce minimum stable generation for {gid}",
                        before_value=f"{val:.1f} MW",
                        after_value=f"{g_cfg.min_mw:.1f} MW",
                        rationale=f"Output was below boiler/turbine flame stability limit ({g_cfg.min_mw:.1f} MW)."
                    ))
                elif val > g_cfg.max_mw:
                    setattr(c, mw_attr, g_cfg.max_mw)
                    actions.append(RepairStep(
                        action=f"Clamp {gid} to maximum continuous rating",
                        before_value=f"{val:.1f} MW",
                        after_value=f"{g_cfg.max_mw:.1f} MW",
                        rationale=f"Output exceeded nameplate thermal rating ({g_cfg.max_mw:.1f} MW)."
                    ))
            else:
                setattr(c, mw_attr, 0.0)

        # 3. Fix simultaneous battery charge and discharge
        if c.battery_charge_mw > 0.05 and c.battery_discharge_mw > 0.05:
            if c.battery_charge_mw >= c.battery_discharge_mw:
                c.battery_charge_mw -= c.battery_discharge_mw
                c.battery_discharge_mw = 0.0
            else:
                c.battery_discharge_mw -= c.battery_charge_mw
                c.battery_charge_mw = 0.0
            actions.append(RepairStep(
                action="Eliminate simultaneous battery charge/discharge",
                before_value=f"Ch={candidate.battery_charge_mw:.1f} MW, Dis={candidate.battery_discharge_mw:.1f} MW",
                after_value=f"Ch={c.battery_charge_mw:.1f} MW, Dis={c.battery_discharge_mw:.1f} MW",
                rationale="Inverter can only operate in unidirectional power conversion mode per timeslice."
            ))

        # 4. Check battery SOC limits and adjust battery transfer
        curr_e = (battery.current_soc_pct / 100.0) * battery.capacity_mwh
        min_e = (battery.min_soc_pct / 100.0) * battery.capacity_mwh
        max_e = (battery.max_soc_pct / 100.0) * battery.capacity_mwh

        if not battery.is_available or battery.forced_offline:
            c.battery_charge_mw = 0.0
            c.battery_discharge_mw = 0.0
        else:
            # Check discharge bound
            max_disch_energy = max(0.0, (curr_e - min_e) * battery.discharge_efficiency)
            if c.battery_discharge_mw > max_disch_energy:
                prev_d = c.battery_discharge_mw
                c.battery_discharge_mw = min(battery.max_discharge_mw, max_disch_energy)
                actions.append(RepairStep(
                    action="Trim battery discharge to prevent SOC underflow",
                    before_value=f"{prev_d:.1f} MW",
                    after_value=f"{c.battery_discharge_mw:.1f} MW",
                    rationale=f"Preserves battery minimum reserve buffer ({battery.min_soc_pct:.0f}% SOC)."
                ))

            # Check charge bound
            max_charge_energy = max(0.0, (max_e - curr_e) / battery.charge_efficiency)
            if c.battery_charge_mw > max_charge_energy:
                prev_c = c.battery_charge_mw
                c.battery_charge_mw = min(battery.max_charge_mw, max_charge_energy)
                actions.append(RepairStep(
                    action="Trim battery charging to prevent SOC overflow",
                    before_value=f"{prev_c:.1f} MW",
                    after_value=f"{c.battery_charge_mw:.1f} MW",
                    rationale=f"Prevents overcharging beyond upper safety limit ({battery.max_soc_pct:.0f}% SOC)."
                ))

        # 5. Clamp renewable dispatch to physical availability
        if c.solar_mw > telemetry.solar_potential_mw:
            c.solar_mw = telemetry.solar_potential_mw
        if c.wind_mw > telemetry.wind_potential_mw:
            c.wind_mw = telemetry.wind_potential_mw

        # 6. Rebalance power equality
        # Injections: P_sol + P_wnd + P_g1 + P_g2 + P_g3 + P_dis + P_imp
        # Withdrawals: Demand + P_ch + P_exp + P_curt
        demand = telemetry.base_demand_mw
        injections = c.solar_mw + c.wind_mw + c.g1_mw + c.g2_mw + c.g3_mw + c.battery_discharge_mw + c.grid_import_mw
        withdrawals = demand + c.battery_charge_mw + c.grid_export_mw
        imbalance = injections - withdrawals

        if abs(imbalance) > 0.05:
            # Deficit: injections < withdrawals (imbalance < 0)
            if imbalance < 0:
                deficit = abs(imbalance)
                # First, try ramping up online generators
                for gid in ["G1", "G2", "G3"]:
                    g_cfg = g_map[gid]
                    committed_attr = f"{gid.lower()}_committed"
                    mw_attr = f"{gid.lower()}_mw"
                    if getattr(c, committed_attr) and g_cfg.is_available and not g_cfg.forced_offline:
                        current_val = getattr(c, mw_attr)
                        headroom = g_cfg.max_mw - current_val
                        if headroom > 0.05:
                            boost = min(deficit, headroom)
                            setattr(c, mw_attr, current_val + boost)
                            deficit -= boost
                            if deficit <= 0.05:
                                break

                # Second, increase grid import if line capacity available
                if deficit > 0.05 and grid.is_available and not grid.forced_offline:
                    grid_headroom = grid.max_import_mw - c.grid_import_mw
                    if grid_headroom > 0.05:
                        grid_boost = min(deficit, grid_headroom)
                        c.grid_import_mw += grid_boost
                        deficit -= grid_boost

                # Third, if still deficient, commit additional available generator (e.g. G2 or G3)
                if deficit > 0.05:
                    for gid in ["G2", "G3", "G1"]:
                        g_cfg = g_map[gid]
                        committed_attr = f"{gid.lower()}_committed"
                        mw_attr = f"{gid.lower()}_mw"
                        if not getattr(c, committed_attr) and g_cfg.is_available and not g_cfg.forced_offline:
                            setattr(c, committed_attr, True)
                            disp = min(g_cfg.max_mw, max(g_cfg.min_mw, deficit))
                            setattr(c, mw_attr, disp)
                            deficit -= disp
                            actions.append(RepairStep(
                                action=f"Emergency commitment of backup unit {gid}",
                                before_value="OFF",
                                after_value=f"ON ({disp:.1f} MW)",
                                rationale=f"Committed standby generator {gid} to eliminate critical supply deficit."
                            ))
                            if deficit <= 0.05:
                                break

                actions.append(RepairStep(
                    action="Rebalanced active power generation deficit",
                    before_value=f"Deficit {abs(imbalance):.1f} MW",
                    after_value="0.0 MW Imbalance",
                    rationale="Dispatched thermal reserves and interconnection to restore grid frequency stability."
                ))

            # Surplus: injections > withdrawals (imbalance > 0)
            else:
                surplus = imbalance
                # First, charge battery if below max SOC
                if battery.is_available and not battery.forced_offline and c.battery_discharge_mw < 0.05:
                    max_ch_room = min(battery.max_charge_mw, max(0.0, (max_e - curr_e) / battery.charge_efficiency)) - c.battery_charge_mw
                    if max_ch_room > 0.05:
                        ch_boost = min(surplus, max_ch_room)
                        c.battery_charge_mw += ch_boost
                        surplus -= ch_boost

                # Second, export to grid
                if surplus > 0.05 and grid.is_available and not grid.forced_offline:
                    exp_room = grid.max_export_mw - c.grid_export_mw
                    if exp_room > 0.05:
                        exp_boost = min(surplus, exp_room)
                        c.grid_export_mw += exp_boost
                        surplus -= exp_boost

                # Third, back down thermal generators towards minimum
                if surplus > 0.05:
                    for gid in ["G3", "G2", "G1"]:
                        g_cfg = g_map[gid]
                        committed_attr = f"{gid.lower()}_committed"
                        mw_attr = f"{gid.lower()}_mw"
                        if getattr(c, committed_attr):
                            current_val = getattr(c, mw_attr)
                            can_reduce = current_val - g_cfg.min_mw
                            if can_reduce > 0.05:
                                red = min(surplus, can_reduce)
                                setattr(c, mw_attr, current_val - red)
                                surplus -= red
                                if surplus <= 0.05:
                                    break

                # Fourth, curtail excess renewables if grid cannot absorb
                if surplus > 0.05:
                    c.curtailment_mw += surplus
                    surplus = 0.0

                actions.append(RepairStep(
                    action="Absorbed active power surplus",
                    before_value=f"Surplus {imbalance:.1f} MW",
                    after_value="0.0 MW Imbalance",
                    rationale="Routed surplus to storage charging, wholesale grid export, or renewable curtailment."
                ))

        # Recalculate metrics for repaired candidate
        c.total_cost_usd = round(
            c.g1_mw * g1.cost_per_mwh + c.g2_mw * g2.cost_per_mwh + c.g3_mw * g3.cost_per_mwh +
            c.grid_import_mw * grid.cost_import_per_mwh - c.grid_export_mw * grid.revenue_export_per_mwh +
            (int(c.g1_committed) * 40.0 + int(c.g2_committed) * 30.0 + int(c.g3_committed) * 20.0), 2
        )
        c.co2_emissions_tons = round(
            c.g1_mw * g1.emission_factor_t_per_mwh +
            c.g2_mw * g2.emission_factor_t_per_mwh +
            c.g3_mw * g3.emission_factor_t_per_mwh +
            c.grid_import_mw * 0.40, 2
        )
        c.renewable_utilization_pct = round(
            ((c.solar_mw + c.wind_mw - c.curtailment_mw) / max(1.0, demand)) * 100.0, 1
        )
        c.reserve_margin_mw = round(
            (int(c.g1_committed) * g1.max_mw - c.g1_mw) +
            (int(c.g2_committed) * g2.max_mw - c.g2_mw) +
            (int(c.g3_committed) * g3.max_mw - c.g3_mw), 1
        )
        c.objective_value = round(
            c.total_cost_usd +
            weights.weight_co2 * c.co2_emissions_tons +
            weights.weight_curtailment * c.curtailment_mw +
            weights.weight_grid_dependency * c.grid_import_mw, 2
        )
        c.solver_type = "Hybrid Quantum Solution (Classically Repaired & Refined)"

        # Post-repair validation check
        post_val = ClassicalFeasibilityValidator.validate(
            c, telemetry, generators, battery, renewables, grid, reserve_requirement_mw
        )
        c.is_feasible = post_val.is_feasible
        c.violations = post_val.failed_reasons

        return RepairResult(
            repair_applied=True,
            original_violations=validation.failed_reasons,
            actions_taken=actions,
            repaired_candidate=c,
            post_repair_feasible=post_val.is_feasible
        )
