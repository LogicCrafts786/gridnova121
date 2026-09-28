from typing import List, Tuple
from app.models.schemas import (
    RiskAssessment, RiskItem, RiskLevel,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry
)

class RiskEngine:
    """
    Deterministic Risk Engine calculating 6 physical grid risk dimensions
    directly from physical system conditions with explicit causal rationales.
    Labeled: 'Risk thresholds are DEMO assumptions.'
    """
    DISCLAIMER = "Risk thresholds are DEMO assumptions for decision-support."

    def __init__(
        self,
        reserve_requirement_mw: float = 25.0,
        critical_soc_pct: float = 25.0,
        high_grid_import_threshold_pct: float = 0.85
    ):
        self.reserve_requirement_mw = reserve_requirement_mw
        self.critical_soc_pct = critical_soc_pct
        self.high_grid_import_threshold_pct = high_grid_import_threshold_pct

    def evaluate_risks(
        self,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        scheduled_grid_import_mw: float = 0.0
    ) -> RiskAssessment:
        items: List[RiskItem] = []

        # 1. Total available generation capacity
        solar_avail = next((r.current_mw for r in renewables if "solar" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        wind_avail = next((r.current_mw for r in renewables if "wind" in r.name.lower() and r.is_available and not r.forced_offline), 0.0)
        gen_max_avail = sum(g.max_mw for g in generators if g.is_available and not g.forced_offline)
        batt_disch_avail = battery.max_discharge_mw if (battery.is_available and not battery.forced_offline and battery.current_soc_pct > battery.min_soc_pct) else 0.0
        grid_import_avail = grid.max_import_mw if (grid.is_available and not grid.forced_offline) else 0.0

        total_available_supply = solar_avail + wind_avail + gen_max_avail + batt_disch_avail + grid_import_avail
        supply_demand_margin = total_available_supply - telemetry.base_demand_mw

        # --- Dimension 1: Power Shortage Risk ---
        if supply_demand_margin < 12.0:
            p_level: RiskLevel = "HIGH"
            p_score = 92.0
            p_reason = f"Critical generation margin deficit: total available capacity ({total_available_supply:.1f} MW) leaves only {supply_demand_margin:.1f} MW cushion over demand ({telemetry.base_demand_mw:.1f} MW)."
        elif supply_demand_margin < 35.0:
            p_level: RiskLevel = "MEDIUM"
            p_score = 58.0
            p_reason = f"Tight operating margin ({supply_demand_margin:.1f} MW) between available supply and load ({telemetry.base_demand_mw:.1f} MW)."
        else:
            p_level: RiskLevel = "LOW"
            p_score = 15.0
            p_reason = f"Adequate generation headroom ({supply_demand_margin:.1f} MW) available to meet demand reliably."
        
        items.append(RiskItem(
            category="Power Shortage",
            level=p_level,
            score_pct=p_score,
            reason=p_reason,
            threshold_info="High if margin < 12 MW, Med if margin < 35 MW"
        ))

        # --- Dimension 2: Renewable Curtailment Risk ---
        # Curtailment occurs when non-dispatchable generation exceeds demand + battery charging + export
        min_thermal_must_run = sum(g.min_mw for g in generators if g.is_available and not g.forced_offline and g.current_mw > 0)
        absorptive_capacity = (
            telemetry.base_demand_mw 
            - min_thermal_must_run 
            + (battery.max_charge_mw if battery.current_soc_pct < battery.max_soc_pct and battery.is_available else 0.0)
            + (grid.max_export_mw if grid.is_available else 0.0)
        )
        surplus_renewables = (solar_avail + wind_avail) - absorptive_capacity

        if surplus_renewables > 20.0:
            c_level: RiskLevel = "HIGH"
            c_score = 85.0
            c_reason = f"High curtailment risk: Renewable potential ({solar_avail + wind_avail:.1f} MW) exceeds grid absorptive threshold by {surplus_renewables:.1f} MW due to thermal minimum constraints and export limits."
        elif surplus_renewables > 5.0:
            c_level: RiskLevel = "MEDIUM"
            c_score = 52.0
            c_reason = f"Moderate curtailment expected ({surplus_renewables:.1f} MW potential surplus) during high renewable peak."
        else:
            c_level: RiskLevel = "LOW"
            c_score = 10.0
            c_reason = "Grid, battery, and local load can absorb 100% of forecast renewable production."
        
        items.append(RiskItem(
            category="Renewable Curtailment",
            level=c_level,
            score_pct=c_score,
            reason=c_reason,
            threshold_info="High if potential surplus > 20 MW"
        ))

        # --- Dimension 3: Reserve Shortage Risk ---
        # Upward spinning reserve from thermal generators + battery headroom
        thermal_upward_reserve = sum(max(0.0, g.max_mw - g.current_mw) for g in generators if g.is_available and not g.forced_offline and g.current_mw > 0)
        total_upward_reserve = thermal_upward_reserve + batt_disch_avail

        if total_upward_reserve < self.reserve_requirement_mw:
            r_level: RiskLevel = "HIGH"
            r_score = 88.0
            r_reason = f"Operating upward reserve ({total_upward_reserve:.1f} MW) has fallen below statutory N-1 reserve requirement ({self.reserve_requirement_mw:.1f} MW), risking blackout on sudden trip."
        elif total_upward_reserve < self.reserve_requirement_mw * 1.35:
            r_level: RiskLevel = "MEDIUM"
            r_score = 55.0
            r_reason = f"Reserve margin is moderate ({total_upward_reserve:.1f} MW vs {self.reserve_requirement_mw:.1f} MW required)."
        else:
            r_level: RiskLevel = "LOW"
            r_score = 18.0
            r_reason = f"Operating reserve healthy ({total_upward_reserve:.1f} MW available vs {self.reserve_requirement_mw:.1f} MW required)."
        
        items.append(RiskItem(
            category="Reserve Shortage",
            level=r_level,
            score_pct=r_score,
            reason=r_reason,
            threshold_info=f"High if upward reserve < {self.reserve_requirement_mw:.0f} MW"
        ))

        # --- Dimension 4: Battery Shortage Risk ---
        if not battery.is_available or battery.forced_offline:
            b_level: RiskLevel = "HIGH"
            b_score = 95.0
            b_reason = "BESS is forced OFFLINE / unavailable; zero dynamic flexibility or frequency response available from energy storage."
        elif battery.current_soc_pct <= self.critical_soc_pct:
            b_level: RiskLevel = "HIGH"
            b_score = 82.0
            b_reason = f"Battery State of Charge is at {battery.current_soc_pct:.1f}%, near lower minimum threshold ({battery.min_soc_pct:.1f}%), depleting peak shaving capability."
        elif battery.current_soc_pct <= 38.0:
            b_level: RiskLevel = "MEDIUM"
            b_score = 50.0
            b_reason = f"Battery SOC is low-to-moderate ({battery.current_soc_pct:.1f}%); reserve discharge energy is constrained."
        else:
            b_level: RiskLevel = "LOW"
            b_score = 12.0
            b_reason = f"Battery SOC is optimal ({battery.current_soc_pct:.1f}%), full 50 MW charge/discharge bandwidth operational."
        
        items.append(RiskItem(
            category="Battery Shortage",
            level=b_level,
            score_pct=b_score,
            reason=b_reason,
            threshold_info=f"High if forced offline or SOC <= {self.critical_soc_pct:.0f}%"
        ))

        # --- Dimension 5: Generator Availability Risk ---
        offline_count = sum(1 for g in generators if not g.is_available or g.forced_offline)
        total_gen_count = len(generators)

        if offline_count >= 2:
            g_level: RiskLevel = "HIGH"
            g_score = 90.0
            g_reason = f"{offline_count} of {total_gen_count} conventional generators are unavailable, severely limiting firm dispatchable generation."
        elif offline_count == 1:
            g_level: RiskLevel = "MEDIUM"
            g_score = 55.0
            g_reason = f"1 generator is currently offline/derated ({[g.name for g in generators if not g.is_available or g.forced_offline][0]}). System operates without redundant backup."
        else:
            g_level: RiskLevel = "LOW"
            g_score = 10.0
            g_reason = "All conventional thermal units (G1, G2, G3) report 100% mechanical availability."

        items.append(RiskItem(
            category="Generator Availability",
            level=g_level,
            score_pct=g_score,
            reason=g_reason,
            threshold_info="High if >= 2 units offline, Med if 1 unit offline"
        ))

        # --- Dimension 6: Grid Dependency Risk ---
        if not grid.is_available or grid.forced_offline:
            gr_level: RiskLevel = "HIGH"
            gr_score = 100.0
            gr_reason = "Regional grid interconnect line is SEVERED/UNAVAILABLE. Microgrid is forced into islanded mode without external balancing support."
        elif scheduled_grid_import_mw >= grid.max_import_mw * self.high_grid_import_threshold_pct:
            gr_level: RiskLevel = "HIGH"
            gr_score = 80.0
            gr_reason = f"Grid import ({scheduled_grid_import_mw:.1f} MW) is operating at {scheduled_grid_import_mw / grid.max_import_mw * 100:.0f}% of interconnection limit ({grid.max_import_mw:.0f} MW), exposing microgrid to external spot price and outage volatility."
        elif scheduled_grid_import_mw >= grid.max_import_mw * 0.50:
            gr_level: RiskLevel = "MEDIUM"
            gr_score = 48.0
            gr_reason = f"Moderate reliance on external grid import ({scheduled_grid_import_mw:.1f} MW)."
        else:
            gr_level: RiskLevel = "LOW"
            gr_score = 15.0
            gr_reason = f"Low external grid dependency ({scheduled_grid_import_mw:.1f} MW import, max {grid.max_import_mw:.0f} MW)."

        items.append(RiskItem(
            category="Grid Dependency",
            level=gr_level,
            score_pct=gr_score,
            reason=gr_reason,
            threshold_info=f"High if import > {self.high_grid_import_threshold_pct*100:.0f}% of limit or interconnect offline"
        ))

        # Overall composite level
        high_count = sum(1 for item in items if item.level == "HIGH")
        avg_score = sum(item.score_pct for item in items) / len(items)

        if high_count >= 2 or any(item.score_pct >= 90 for item in items):
            overall_level: RiskLevel = "HIGH"
            is_emergency = True
        elif high_count == 1 or avg_score >= 45.0:
            overall_level: RiskLevel = "MEDIUM"
            is_emergency = False
        else:
            overall_level: RiskLevel = "LOW"
            is_emergency = False

        return RiskAssessment(
            overall_level=overall_level,
            overall_score_pct=round(avg_score, 1),
            items=items,
            is_emergency=is_emergency,
            disclaimer=self.DISCLAIMER
        )
