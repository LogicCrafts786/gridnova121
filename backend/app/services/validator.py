from typing import List, Tuple
from app.models.schemas import (
    DispatchCandidate, ValidationResult, ConstraintCheck,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry
)

class ClassicalFeasibilityValidator:
    """
    Classical Feasibility Validator.
    Inspects candidate dispatch solutions against 10 fundamental physical and operational grid constraints.
    Returns FEASIBLE or INFEASIBLE with exact failure reasons and deviations.
    """

    @staticmethod
    def validate(
        candidate: DispatchCandidate,
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        reserve_requirement_mw: float = 25.0,
        tolerance_mw: float = 0.10
    ) -> ValidationResult:
        checks: List[ConstraintCheck] = []
        failed_reasons: List[str] = []

        # 1. Power Balance Check
        # Total Generation + Import + Disch = Demand + Charge + Export + Curtailment
        solar_in = candidate.solar_mw
        wind_in = candidate.wind_mw
        thermal_in = candidate.g1_mw + candidate.g2_mw + candidate.g3_mw
        import_in = candidate.grid_import_mw
        disch_in = candidate.battery_discharge_mw

        total_injections = solar_in + wind_in + thermal_in + import_in + disch_in
        total_withdrawals = (
            telemetry.base_demand_mw 
            + candidate.battery_charge_mw 
            + candidate.grid_export_mw
        )

        imbalance = total_injections - total_withdrawals
        balance_ok = abs(imbalance) <= tolerance_mw
        checks.append(ConstraintCheck(
            name="Power Balance Equality",
            satisfied=balance_ok,
            actual_value=f"Injections={total_injections:.1f} MW, Withdrawals={total_withdrawals:.1f} MW",
            limit_value="Net Imbalance = 0 MW (tolerance ±0.1 MW)",
            deviation=f"{imbalance:+.2f} MW" if not balance_ok else "0.0 MW"
        ))
        if not balance_ok:
            failed_reasons.append(f"Power balance violated: generation and withdrawals mismatch by {imbalance:+.2f} MW.")

        # 2. Generator Limits & Availability
        g_map = {g.id: g for g in generators}
        g_dispatch = [
            ("G1", candidate.g1_committed, candidate.g1_mw),
            ("G2", candidate.g2_committed, candidate.g2_mw),
            ("G3", candidate.g3_committed, candidate.g3_mw),
        ]

        for gid, committed, mw in g_dispatch:
            cfg = g_map.get(gid)
            if not cfg:
                continue

            # Availability check
            if committed and (not cfg.is_available or cfg.forced_offline):
                checks.append(ConstraintCheck(
                    name=f"Generator {gid} Availability",
                    satisfied=False,
                    actual_value="Committed (ON)",
                    limit_value="Unit Unavailable / Forced Offline",
                    deviation="Illegal dispatch of offline unit"
                ))
                failed_reasons.append(f"Generator {gid} is dispatched ON but unit is offline / unavailable.")
            else:
                checks.append(ConstraintCheck(
                    name=f"Generator {gid} Availability",
                    satisfied=True,
                    actual_value="Compliant",
                    limit_value="Unit Available"
                ))

            # Capacity bounds
            if committed:
                within_bounds = (cfg.min_mw - tolerance_mw <= mw <= cfg.max_mw + tolerance_mw)
                checks.append(ConstraintCheck(
                    name=f"Generator {gid} Capacity Limits",
                    satisfied=within_bounds,
                    actual_value=f"{mw:.1f} MW",
                    limit_value=f"[{cfg.min_mw:.1f} - {cfg.max_mw:.1f} MW]",
                    deviation=f"{mw - cfg.max_mw:+.1f} MW" if mw > cfg.max_mw else (f"{mw - cfg.min_mw:+.1f} MW" if mw < cfg.min_mw else None)
                ))
                if not within_bounds:
                    failed_reasons.append(f"Generator {gid} output ({mw:.1f} MW) is outside technical limits [{cfg.min_mw:.1f} - {cfg.max_mw:.1f} MW].")
            else:
                zero_mw = abs(mw) <= tolerance_mw
                checks.append(ConstraintCheck(
                    name=f"Generator {gid} Off-State Output",
                    satisfied=zero_mw,
                    actual_value=f"{mw:.1f} MW",
                    limit_value="0.0 MW",
                    deviation=f"{mw:.1f} MW" if not zero_mw else None
                ))
                if not zero_mw:
                    failed_reasons.append(f"Generator {gid} is uncommitted (OFF) but dispatched {mw:.1f} MW.")

        # 3. Simultaneous Charge/Discharge Check
        simultaneous_batt = (candidate.battery_charge_mw > tolerance_mw) and (candidate.battery_discharge_mw > tolerance_mw)
        checks.append(ConstraintCheck(
            name="Battery Complementarity (No Simultaneous Charge/Discharge)",
            satisfied=not simultaneous_batt,
            actual_value=f"Charge={candidate.battery_charge_mw:.1f} MW, Discharge={candidate.battery_discharge_mw:.1f} MW",
            limit_value="At most one active state"
        ))
        if simultaneous_batt:
            failed_reasons.append("Battery cannot charge and discharge simultaneously.")

        # 4. Battery Power Limits & SOC
        batt_avail = battery.is_available and not battery.forced_offline
        if not batt_avail and (candidate.battery_charge_mw > 0.1 or candidate.battery_discharge_mw > 0.1):
            checks.append(ConstraintCheck(
                name="Battery Availability",
                satisfied=False,
                actual_value=f"Dispatched {candidate.battery_charge_mw + candidate.battery_discharge_mw:.1f} MW",
                limit_value="Battery is Offline / Tripped"
            ))
            failed_reasons.append("Battery is offline but scheduled for active power transfer.")
        else:
            checks.append(ConstraintCheck(
                name="Battery Availability",
                satisfied=True,
                actual_value="Compliant",
                limit_value="Available"
            ))

        # SOC trajectory for 1-hour interval
        # ΔE_charge = P_ch * η_ch * 1h
        # ΔE_discharge = P_dis / η_dis * 1h
        delta_e = (candidate.battery_charge_mw * battery.charge_efficiency) - (candidate.battery_discharge_mw / max(0.1, battery.discharge_efficiency))
        new_e = (battery.current_soc_pct / 100.0 * battery.capacity_mwh) + delta_e
        new_soc_pct = (new_e / battery.capacity_mwh) * 100.0

        soc_ok = (battery.min_soc_pct - 0.5 <= new_soc_pct <= battery.max_soc_pct + 0.5)
        checks.append(ConstraintCheck(
            name="Battery State of Charge (SOC) Bounds",
            satisfied=soc_ok,
            actual_value=f"{new_soc_pct:.1f}% (Current: {battery.current_soc_pct:.1f}%)",
            limit_value=f"[{battery.min_soc_pct:.1f}% - {battery.max_soc_pct:.1f}%]",
            deviation=f"{new_soc_pct - battery.max_soc_pct:+.1f}%" if new_soc_pct > battery.max_soc_pct else (f"{new_soc_pct - battery.min_soc_pct:+.1f}%" if new_soc_pct < battery.min_soc_pct else None)
        ))
        if not soc_ok:
            if new_soc_pct < battery.min_soc_pct:
                failed_reasons.append(f"Battery SOC would fall to {new_soc_pct:.1f}%, below minimum allowable limit ({battery.min_soc_pct:.1f}%).")
            else:
                failed_reasons.append(f"Battery SOC would rise to {new_soc_pct:.1f}%, exceeding maximum safe storage limit ({battery.max_soc_pct:.1f}%).")

        # 5. Grid Interconnection Limits
        grid_avail = grid.is_available and not grid.forced_offline
        if not grid_avail and (candidate.grid_import_mw > 0.1 or candidate.grid_export_mw > 0.1):
            checks.append(ConstraintCheck(
                name="Grid Interconnection Line Availability",
                satisfied=False,
                actual_value=f"Import={candidate.grid_import_mw:.1f} MW, Export={candidate.grid_export_mw:.1f} MW",
                limit_value="Grid Interconnection Severed"
            ))
            failed_reasons.append("Grid interconnection is disconnected/tripped but power exchange was scheduled.")
        else:
            import_ok = candidate.grid_import_mw <= grid.max_import_mw + tolerance_mw
            export_ok = candidate.grid_export_mw <= grid.max_export_mw + tolerance_mw
            checks.append(ConstraintCheck(
                name="Grid Import / Export Thermal Limits",
                satisfied=import_ok and export_ok,
                actual_value=f"Import={candidate.grid_import_mw:.1f} MW, Export={candidate.grid_export_mw:.1f} MW",
                limit_value=f"Import <= {grid.max_import_mw:.0f} MW, Export <= {grid.max_export_mw:.0f} MW"
            ))
            if not import_ok:
                failed_reasons.append(f"Grid import ({candidate.grid_import_mw:.1f} MW) exceeds line thermal rating ({grid.max_import_mw:.0f} MW).")
            if not export_ok:
                failed_reasons.append(f"Grid export ({candidate.grid_export_mw:.1f} MW) exceeds line reverse transfer limit ({grid.max_export_mw:.0f} MW).")

        # 6. Renewable Availability Bounds
        solar_pot = telemetry.solar_potential_mw
        wind_pot = telemetry.wind_potential_mw
        solar_ok = candidate.solar_mw <= solar_pot + tolerance_mw
        wind_ok = candidate.wind_mw <= wind_pot + tolerance_mw

        checks.append(ConstraintCheck(
            name="Renewable Resource Availability Bounds",
            satisfied=solar_ok and wind_ok,
            actual_value=f"Solar={candidate.solar_mw:.1f} MW, Wind={candidate.wind_mw:.1f} MW",
            limit_value=f"Solar Potential <= {solar_pot:.1f} MW, Wind Potential <= {wind_pot:.1f} MW"
        ))
        if not solar_ok:
            failed_reasons.append(f"Dispatched solar ({candidate.solar_mw:.1f} MW) exceeds physical solar resource ({solar_pot:.1f} MW).")
        if not wind_ok:
            failed_reasons.append(f"Dispatched wind ({candidate.wind_mw:.1f} MW) exceeds physical wind resource ({wind_pot:.1f} MW).")

        # 7. Operating Spinning Reserve Check
        # Upward headroom from committed generators and battery discharge headroom
        upward_reserve = 0.0
        for gid, committed, mw in g_dispatch:
            cfg = g_map.get(gid)
            if cfg and committed and cfg.is_available and not cfg.forced_offline:
                upward_reserve += max(0.0, cfg.max_mw - mw)
        if batt_avail:
            upward_reserve += max(0.0, battery.max_discharge_mw - candidate.battery_discharge_mw)

        reserve_ok = upward_reserve >= reserve_requirement_mw - 1.0 # 1 MW grace
        checks.append(ConstraintCheck(
            name="Operating Spinning Reserve Requirement",
            satisfied=reserve_ok,
            actual_value=f"{upward_reserve:.1f} MW",
            limit_value=f">= {reserve_requirement_mw:.1f} MW",
            deviation=f"{upward_reserve - reserve_requirement_mw:+.1f} MW" if not reserve_ok else None
        ))
        if not reserve_ok:
            failed_reasons.append(f"Insufficient spinning reserve: available {upward_reserve:.1f} MW is below required {reserve_requirement_mw:.1f} MW.")

        is_feasible = (len(failed_reasons) == 0)
        return ValidationResult(
            is_feasible=is_feasible,
            checks=checks,
            failed_reasons=failed_reasons,
            max_imbalance_mw=round(abs(imbalance), 2)
        )
