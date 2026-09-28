from typing import List, Tuple
from app.models.schemas import (
    ResourceAvailabilityItem, ResourceStatus,
    GeneratorConfig, BatteryConfig, RenewableConfig, GridInterconnectConfig,
    SystemTelemetry, WhatIfOverrides
)

class ResourceManager:
    """
    Tracks and updates operational availability and derated limits for all microgrid assets:
    Solar, Wind, G1, G2, G3, Battery, and Grid Interconnect.
    """

    @staticmethod
    def evaluate_resources(
        telemetry: SystemTelemetry,
        generators: List[GeneratorConfig],
        battery: BatteryConfig,
        renewables: List[RenewableConfig],
        grid: GridInterconnectConfig,
        overrides: WhatIfOverrides = None
    ) -> List[ResourceAvailabilityItem]:
        items: List[ResourceAvailabilityItem] = []

        # 1. Solar
        solar = next((r for r in renewables if "solar" in r.name.lower()), None)
        if solar:
            is_offline = solar.forced_offline or (overrides and overrides.emergency_event == "SOLAR_DROP")
            avail_cap = 0.0 if is_offline else telemetry.solar_potential_mw
            if is_offline:
                status: ResourceStatus = "UNAVAILABLE"
                reason = "Solar inverter tripped / forced offline during emergency event."
            elif avail_cap < solar.capacity_mw * 0.20:
                status = "LIMITED"
                reason = f"Low irradiance ({telemetry.solar_irradiance_w_m2:.0f} W/m²) due to cloud cover or nighttime."
            else:
                status = "AVAILABLE"
                reason = f"Optimal solar irradiation ({telemetry.solar_irradiance_w_m2:.0f} W/m²)."
            
            items.append(ResourceAvailabilityItem(
                resource_id=solar.id,
                resource_name=solar.name,
                resource_type="Renewable Solar PV",
                max_capacity_mw=solar.capacity_mw,
                available_capacity_mw=round(avail_cap, 1),
                current_output_mw=round(solar.current_mw, 1),
                status=status,
                reason=reason
            ))

        # 2. Wind
        wind = next((r for r in renewables if "wind" in r.name.lower()), None)
        if wind:
            is_offline = wind.forced_offline or (overrides and overrides.emergency_event == "WIND_DROP")
            avail_cap = 0.0 if is_offline else telemetry.wind_potential_mw
            if is_offline:
                status = "UNAVAILABLE"
                reason = "Wind farm disconnected or calm wind cut-in failure."
            elif avail_cap < wind.capacity_mw * 0.25:
                status = "LIMITED"
                reason = f"Sub-optimal wind speed ({telemetry.wind_speed_m_s:.1f} m/s) below rated speed (12 m/s)."
            else:
                status = "AVAILABLE"
                reason = f"Strong wind resource ({telemetry.wind_speed_m_s:.1f} m/s), turbines at normal aerodynamic pitch."
            
            items.append(ResourceAvailabilityItem(
                resource_id=wind.id,
                resource_name=wind.name,
                resource_type="Renewable Wind Farm",
                max_capacity_mw=wind.capacity_mw,
                available_capacity_mw=round(avail_cap, 1),
                current_output_mw=round(wind.current_mw, 1),
                status=status,
                reason=reason
            ))

        # 3. Generators G1, G2, G3
        for g in generators:
            is_forced = g.forced_offline or not g.is_available
            if overrides:
                if g.id == "G1" and not overrides.g1_available:
                    is_forced = True
                elif g.id == "G2" and not overrides.g2_available:
                    is_forced = True
                elif g.id == "G3" and not overrides.g3_available:
                    is_forced = True

            if is_forced:
                status = "UNAVAILABLE"
                avail_cap = 0.0
                reason = f"Generator {g.name} is tripped / scheduled maintenance / forced offline."
            else:
                status = "AVAILABLE"
                avail_cap = g.max_mw
                reason = f"Nominal mechanical readiness; operational range [{g.min_mw:.0f} - {g.max_mw:.0f} MW]."

            items.append(ResourceAvailabilityItem(
                resource_id=g.id,
                resource_name=g.name,
                resource_type="Thermal Generator",
                max_capacity_mw=g.max_mw,
                available_capacity_mw=avail_cap,
                current_output_mw=round(g.current_mw, 1),
                status=status,
                reason=reason
            ))

        # 4. Battery Storage
        batt_forced = battery.forced_offline or not battery.is_available or (overrides and not overrides.battery_available)
        if batt_forced:
            b_status: ResourceStatus = "UNAVAILABLE"
            b_avail_cap = 0.0
            b_reason = "BESS protection tripped or manual isolation active."
        elif battery.current_soc_pct <= battery.min_soc_pct:
            b_status = "LIMITED"
            b_avail_cap = 0.0
            b_reason = f"Battery depleted to minimum SOC threshold ({battery.current_soc_pct:.1f}% <= {battery.min_soc_pct:.1f}%). Discharge blocked."
        elif battery.current_soc_pct >= battery.max_soc_pct:
            b_status = "LIMITED"
            b_avail_cap = battery.max_discharge_mw
            b_reason = f"Battery saturated at maximum SOC ({battery.current_soc_pct:.1f}% >= {battery.max_soc_pct:.1f}%). Charging blocked."
        else:
            b_status = "AVAILABLE"
            b_avail_cap = battery.max_discharge_mw
            b_reason = f"Operating in nominal state of charge window ({battery.current_soc_pct:.1f}% SOC). Ready for 50 MW bidirectional dispatch."

        items.append(ResourceAvailabilityItem(
            resource_id=battery.id,
            resource_name=battery.name,
            resource_type="Battery Storage (BESS)",
            max_capacity_mw=battery.max_discharge_mw,
            available_capacity_mw=b_avail_cap,
            current_output_mw=round(battery.max_discharge_mw if battery.current_soc_pct > 50 else 0.0, 1), # placeholder, updated by optimizer
            status=b_status,
            reason=b_reason
        ))

        # 5. Grid Interconnect
        grid_forced = grid.forced_offline or not grid.is_available or (overrides and not overrides.grid_available)
        if grid_forced:
            gr_status: ResourceStatus = "UNAVAILABLE"
            gr_avail_cap = 0.0
            gr_reason = "Main regional feeder tripped or breaker open. Grid islanded."
        else:
            gr_status = "AVAILABLE"
            gr_avail_cap = grid.max_import_mw
            gr_reason = f"Transmission line energized. Capacity: +{grid.max_import_mw:.0f} MW import / -{grid.max_export_mw:.0f} MW export."

        items.append(ResourceAvailabilityItem(
            resource_id=grid.id,
            resource_name=grid.name,
            resource_type="Grid Interconnection",
            max_capacity_mw=grid.max_import_mw,
            available_capacity_mw=gr_avail_cap,
            current_output_mw=0.0, # updated by optimizer
            status=gr_status,
            reason=gr_reason
        ))

        return items
