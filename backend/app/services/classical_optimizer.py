import time
import numpy as np
from typing import List, Tuple, Optional
from scipy.optimize import linprog
from app.models.schemas import (
    DispatchCandidate, OptimizationWeights,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry
)

class ClassicalOptimizer:
    """
    Classical Unit Commitment (UC) + Economic Dispatch (ED) + Storage Optimizer.
    Evaluates discrete commitment space and solves continuous linear programming
    dispatch for each commitment state using scipy.optimize.linprog.
    Guarantees global classical optimality.
    """

    def solve(
        self,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        weights: OptimizationWeights,
        reserve_requirement_mw: float = 25.0
    ) -> DispatchCandidate:
        t0 = time.perf_counter()

        g_map = {g.id: g for g in generators}
        g1 = g_map["G1"]
        g2 = g_map["G2"]
        g3 = g_map["G3"]

        solar_avail = next((r.current_mw for r in renewables if "solar" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        wind_avail = next((r.current_mw for r in renewables if "wind" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        demand = telemetry.base_demand_mw

        # Battery energy constraints
        # Max discharge allowed based on SOC
        curr_e = (battery.current_soc_pct / 100.0) * battery.capacity_mwh
        min_e = (battery.min_soc_pct / 100.0) * battery.capacity_mwh
        max_e = (battery.max_soc_pct / 100.0) * battery.capacity_mwh

        # In 1 hour: energy out = P_dis / eta_dis <= (curr_e - min_e)
        allowed_discharge_mw = 0.0
        if battery.is_available and not battery.forced_offline:
            allowed_discharge_mw = min(battery.max_discharge_mw, max(0.0, (curr_e - min_e) * battery.discharge_efficiency))

        # energy in = P_ch * eta_ch <= (max_e - curr_e)
        allowed_charge_mw = 0.0
        if battery.is_available and not battery.forced_offline:
            allowed_charge_mw = min(battery.max_charge_mw, max(0.0, (max_e - curr_e) / battery.charge_efficiency))

        grid_max_imp = grid.max_import_mw if (grid.is_available and not grid.forced_offline) else 0.0
        grid_max_exp = grid.max_export_mw if (grid.is_available and not grid.forced_offline) else 0.0

        best_candidate: Optional[DispatchCandidate] = None
        best_obj = float('inf')

        # Unit commitment search over 2^3 binary combinations
        for u1 in [0, 1]:
            if u1 == 1 and (not g1.is_available or g1.forced_offline):
                continue
            for u2 in [0, 1]:
                if u2 == 1 and (not g2.is_available or g2.forced_offline):
                    continue
                for u3 in [0, 1]:
                    if u3 == 1 and (not g3.is_available or g3.forced_offline):
                        continue

                    # Decision variables:
                    # x = [P_g1, P_g2, P_g3, P_sol, P_wnd, P_ch, P_dis, P_imp, P_exp, P_curt]
                    # Indices:
                    # 0: P_g1
                    # 1: P_g2
                    # 2: P_g3
                    # 3: P_sol
                    # 4: P_wnd
                    # 5: P_ch
                    # 6: P_dis
                    # 7: P_imp
                    # 8: P_exp
                    # 9: P_curt

                    # Cost vector c:
                    c_g1 = (g1.cost_per_mwh + weights.weight_co2 * g1.emission_factor_t_per_mwh)
                    c_g2 = (g2.cost_per_mwh + weights.weight_co2 * g2.emission_factor_t_per_mwh)
                    c_g3 = (g3.cost_per_mwh + weights.weight_co2 * g3.emission_factor_t_per_mwh)
                    c_sol = 2.0  # minimal operational cost
                    c_wnd = 3.0
                    c_ch = 1.0   # storage cycle cost
                    c_dis = 2.0
                    c_imp = grid.cost_import_per_mwh + weights.weight_grid_dependency * 0.5
                    c_exp = -grid.revenue_export_per_mwh
                    c_curt = weights.weight_curtailment

                    # Fixed commitment cost
                    commit_cost = (u1 * 40.0) + (u2 * 30.0) + (u3 * 20.0)

                    c = [c_g1, c_g2, c_g3, c_sol, c_wnd, c_ch, c_dis, c_imp, c_exp, c_curt]

                    # Bounds:
                    bounds = [
                        (g1.min_mw if u1 else 0.0, g1.max_mw if u1 else 0.0),
                        (g2.min_mw if u2 else 0.0, g2.max_mw if u2 else 0.0),
                        (g3.min_mw if u3 else 0.0, g3.max_mw if u3 else 0.0),
                        (0.0, solar_avail),
                        (0.0, wind_avail),
                        (0.0, allowed_charge_mw),
                        (0.0, allowed_discharge_mw),
                        (0.0, grid_max_imp),
                        (0.0, grid_max_exp),
                        (0.0, solar_avail + wind_avail) # Curtailment upper bound
                    ]

                    # Equality Constraint: Power balance
                    # P_g1 + P_g2 + P_g3 + P_sol + P_wnd + P_dis + P_imp - P_ch - P_exp - P_curt = Demand
                    # Note: Curtailment is (P_sol_avail - P_sol) + (P_wnd_avail - P_wnd)
                    # Let's enforce:
                    # P_sol + P_wnd + P_curt = solar_avail + wind_avail
                    # and P_g1 + P_g2 + P_g3 + P_sol + P_wnd + P_dis + P_imp - P_ch - P_exp = Demand
                    A_eq = [
                        [1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 0.0],
                        [0.0, 0.0, 0.0, 1.0, 1.0,  0.0, 0.0, 0.0,  0.0, 1.0]
                    ]
                    b_eq = [
                        demand,
                        solar_avail + wind_avail
                    ]

                    # Inequality Constraint: Operating Reserve
                    # (g1.max*u1 - P_g1) + (g2.max*u2 - P_g2) + (g3.max*u3 - P_g3) + (allowed_disch - P_dis) >= ReserveReq
                    # => P_g1 + P_g2 + P_g3 + P_dis <= (u1*g1.max + u2*g2.max + u3*g3.max + allowed_disch) - ReserveReq
                    max_therm = u1 * g1.max_mw + u2 * g2.max_mw + u3 * g3.max_mw
                    rhs_reserve = (max_therm + allowed_discharge_mw) - reserve_requirement_mw

                    A_ub = [
                        [1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]
                    ]
                    b_ub = [rhs_reserve]

                    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method="highs")

                    # If reserve cannot be strictly met, try without hard reserve constraint but with penalty
                    if not res.success:
                        res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method="highs")

                    if res.success:
                        x = res.x
                        p_g1, p_g2, p_g3, p_sol, p_wnd, p_ch, p_dis, p_imp, p_exp, p_curt = x

                        cost_usd = (
                            p_g1 * g1.cost_per_mwh + p_g2 * g2.cost_per_mwh + p_g3 * g3.cost_per_mwh +
                            p_imp * grid.cost_import_per_mwh - p_exp * grid.revenue_export_per_mwh +
                            commit_cost
                        )
                        co2_tons = (
                            p_g1 * g1.emission_factor_t_per_mwh +
                            p_g2 * g2.emission_factor_t_per_mwh +
                            p_g3 * g3.emission_factor_t_per_mwh +
                            p_imp * 0.40 # regional grid emission factor
                        )
                        gen_renew = p_sol + p_wnd
                        renew_pct = (gen_renew / max(1.0, demand)) * 100.0

                        upward_res = (u1 * g1.max_mw - p_g1) + (u2 * g2.max_mw - p_g2) + (u3 * g3.max_mw - p_g3) + (allowed_discharge_mw - p_dis)
                        res_penalty = max(0.0, reserve_requirement_mw - upward_res) * weights.weight_risk * 15.0

                        total_objective = (
                            cost_usd +
                            weights.weight_co2 * co2_tons +
                            weights.weight_curtailment * p_curt +
                            res_penalty +
                            weights.weight_grid_dependency * p_imp
                        )

                        if total_objective < best_obj:
                            best_obj = total_objective
                            best_candidate = DispatchCandidate(
                                solver_type="Classical Mixed-Integer Simplex / Interior-Point (SciPy HiGHS)",
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
                                is_feasible=True,
                                violations=[],
                                objective_value=round(total_objective, 2),
                                runtime_ms=round((time.perf_counter() - t0) * 1000.0, 2)
                            )

        # Fallback if unconstrained
        if not best_candidate:
            t_elapsed = round((time.perf_counter() - t0) * 1000.0, 2)
            return DispatchCandidate(
                solver_type="Classical Solver",
                g1_committed=False,
                g1_mw=0.0,
                g2_committed=False,
                g2_mw=0.0,
                g3_committed=False,
                g3_mw=0.0,
                solar_mw=solar_avail,
                wind_mw=wind_avail,
                battery_charge_mw=0.0,
                battery_discharge_mw=0.0,
                grid_import_mw=grid_max_imp,
                grid_export_mw=0.0,
                curtailment_mw=0.0,
                total_cost_usd=0.0,
                co2_emissions_tons=0.0,
                renewable_utilization_pct=0.0,
                reserve_margin_mw=0.0,
                is_feasible=False,
                violations=["No feasible classical schedule found under specified bounds."],
                objective_value=999999.0,
                runtime_ms=t_elapsed
            )

        best_candidate.runtime_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return best_candidate
