from typing import List, Optional
from app.models.schemas import (
    ExplainabilityReport, DispatchCandidate, SystemTelemetry,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig
)

class ExplainabilityEngine:
    """
    AI Explainability Engine.
    Synthesizes causal 'WHY THIS SCHEDULE?' explanations based strictly on calculated physical deltas,
    marginal generation costs, emission penalties, outage contingencies, and constraint bindings.
    """

    @staticmethod
    def generate_explanation(
        schedule: DispatchCandidate,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        prev_schedule: Optional[DispatchCandidate] = None
    ) -> ExplainabilityReport:
        key_drivers: List[str] = []

        solar_avail = telemetry.solar_potential_mw
        wind_avail = telemetry.wind_potential_mw
        demand = telemetry.base_demand_mw
        renew_gen = schedule.solar_mw + schedule.wind_mw

        # 0. Asset Outage / Contingency Drivers
        batt_avail = battery.is_available and not battery.forced_offline
        if not batt_avail:
            key_drivers.append("Contingency: BESS Battery Storage is UNAVAILABLE / FORCED OFFLINE. Baseload thermal generation and grid imports dynamically scaled to guarantee spinning reserve adequacy.")

        offline_gens = [g.id for g in generators if not g.is_available or g.forced_offline]
        if offline_gens:
            key_drivers.append(f"Contingency: Thermal Generator(s) {', '.join(offline_gens)} tripped or forced offline. Re-optimized commitment over remaining available assets.")

        grid_avail = grid.is_available and not grid.forced_offline
        if not grid_avail:
            key_drivers.append("Contingency: Regional Grid Interconnection SEVERED. Microgrid islanding enforced with zero external power exchange.")

        # 1. Renewable penetration driver
        renew_share = (renew_gen / max(1.0, demand)) * 100.0
        if renew_share >= 60.0:
            key_drivers.append(
                f"High renewable penetration ({renew_share:.1f}%): Abundant clean generation from Solar ({schedule.solar_mw:.1f} MW) and Wind ({schedule.wind_mw:.1f} MW) displaced expensive fossil dispatch."
            )
        elif renew_share <= 25.0:
            key_drivers.append(
                f"Low renewable availability ({renew_share:.1f}% of load): Subdued solar ({schedule.solar_mw:.1f} MW) and wind ({schedule.wind_mw:.1f} MW) required base/intermediate thermal commitment."
            )
        else:
            key_drivers.append(
                f"Moderate renewable contribution ({renew_share:.1f}%): Balanced dispatch across clean renewables and economic firm capacity."
            )

        # 2. Generator dispatch rationale
        active_gens = []
        if schedule.g1_committed:
            active_gens.append(f"G1 ({schedule.g1_mw:.1f} MW @ $35/MWh)")
        if schedule.g2_committed:
            active_gens.append(f"G2 ({schedule.g2_mw:.1f} MW @ $52/MWh)")
        if schedule.g3_committed:
            active_gens.append(f"G3 ({schedule.g3_mw:.1f} MW @ $85/MWh)")

        if active_gens:
            outage_note = f" (Note: {', '.join(offline_gens)} offline)" if offline_gens else ""
            gen_rationale = (
                f"Committed {len(active_gens)} units: {', '.join(active_gens)}{outage_note}. "
                "The optimizer prioritized lower-cost base-load G1 before bringing intermediate G2 online, "
                "keeping expensive peaker G3 idle unless required for peak deficit or reserve requirements."
            )
        else:
            gen_rationale = "Zero thermal generators committed: 100% of demand served by renewables, battery storage, and grid import."

        # 3. Battery decision rationale
        if not batt_avail:
            batt_rationale = (
                "BESS Storage is UNAVAILABLE / FORCED OFFLINE: Active power exchange is locked at 0.0 MW. "
                "The optimizer re-routed all rapid response and reserve margins to online thermal generators and interconnection."
            )
        elif schedule.battery_discharge_mw > 1.0:
            batt_rationale = (
                f"Discharged BESS at {schedule.battery_discharge_mw:.1f} MW: The optimizer utilized stored clean energy "
                f"to displace peaker thermal generation ($85/MWh) while maintaining SOC above safety floor ({battery.min_soc_pct:.0f}%)."
            )
            key_drivers.append("Battery discharge dispatched to avoid higher marginal generation and carbon costs.")
        elif schedule.battery_charge_mw > 1.0:
            batt_rationale = (
                f"Charged BESS at {schedule.battery_charge_mw:.1f} MW: Absorbed surplus low-cost energy "
                f"to prevent renewable curtailment and pre-charge storage for upcoming peak demand hours."
            )
            key_drivers.append("Battery charging prioritized to store surplus renewable energy.")
        else:
            batt_rationale = f"Battery held in idle standby (SOC={battery.current_soc_pct:.1f}%): Storage bandwidth preserved for rapid frequency response or future net load ramps."

        # 4. Grid tradeoff rationale
        if not grid_avail:
            grid_rationale = "Regional Grid Interconnect is SEVERED / TRIPPED: Microgrid operating in strictly islanded mode with zero grid import/export capability."
        elif schedule.grid_import_mw > 1.0:
            grid_rationale = (
                f"Imported {schedule.grid_import_mw:.1f} MW across regional interconnection ($75/MWh): "
                "Selected over firing peaker generator G3 ($85/MWh + CO2 penalties), minimizing total system operating cost."
            )
        elif schedule.grid_export_mw > 1.0:
            grid_rationale = (
                f"Exported {schedule.grid_export_mw:.1f} MW to bulk grid: Generated revenue ($30/MWh) by monetizing excess generation after fully satisfying local demand and storage charging."
            )
        else:
            grid_rationale = "Zero grid exchange: Microgrid operating in self-sufficient islanded energy balance."

        # 5. Curtailment rationale
        if schedule.curtailment_mw > 0.5:
            curt_rationale = (
                f"Curtailed {schedule.curtailment_mw:.1f} MW of renewable output: Clean supply exceeded local demand ({demand:.1f} MW), "
                f"battery maximum charging power ({battery.max_charge_mw:.0f} MW), and grid export thermal capacity ({grid.max_export_mw:.0f} MW)."
            )
            key_drivers.append(f"Renewable curtailment of {schedule.curtailment_mw:.1f} MW occurred due to transmission/storage hosting bottlenecks.")
        else:
            curt_rationale = "Zero renewable curtailment: 100% of available green generation utilized or stored."

        # Comparison with previous schedule if available
        if prev_schedule:
            cost_delta = schedule.total_cost_usd - prev_schedule.total_cost_usd
            if abs(cost_delta) > 1.0:
                key_drivers.append(
                    f"Operational Transition: Total operating cost shifted by {cost_delta:+.2f} USD compared to previous schedule "
                    f"(Reserve margin: {schedule.reserve_margin_mw:.1f} MW vs previous {prev_schedule.reserve_margin_mw:.1f} MW)."
                )

        summary = (
            f"Schedule dispatches {renew_gen:.1f} MW renewable, {schedule.g1_mw + schedule.g2_mw + schedule.g3_mw:.1f} MW thermal, "
            f"and net {schedule.grid_import_mw - schedule.grid_export_mw:+.1f} MW grid transfer to meet {demand:.1f} MW demand "
            f"at ${schedule.total_cost_usd:.2f} total cost and {schedule.co2_emissions_tons:.2f} tCO2."
        )

        return ExplainabilityReport(
            summary=summary,
            key_drivers=key_drivers,
            battery_decision_rationale=batt_rationale,
            generator_dispatch_rationale=gen_rationale,
            grid_tradeoff_rationale=grid_rationale,
            curtailment_rationale=curt_rationale
        )
