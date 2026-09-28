import math
import random
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.models.schemas import SystemTelemetry, ScenarioType, WhatIfOverrides

class BaseDataProvider(ABC):
    """
    Abstract interface for microgrid data telemetry.
    Can be implemented by real SCADA / OPC-UA / MQTT connectors or simulation providers.
    """
    @abstractmethod
    def get_telemetry(self, hour: float, scenario: ScenarioType, overrides: Optional[WhatIfOverrides] = None) -> SystemTelemetry:
        pass

class SimulatedDataProvider(BaseDataProvider):
    """
    Simulated Demo Data Provider.
    Clearly labeled: 'Data Source: Simulated Demo Data'
    Generates physically plausible diurnal solar, wind, temperature, and load profiles.
    """
    DATA_SOURCE_LABEL = "Data Source: Simulated Demo Data"

    def __init__(self, random_seed: int = 42):
        self.rng = random.Random(random_seed)

    def get_telemetry(self, hour: float, scenario: ScenarioType = "NORMAL", overrides: Optional[WhatIfOverrides] = None) -> SystemTelemetry:
        # Normalize hour into 0-24 range
        h = hour % 24.0

        # Scenario modifiers
        scenario_solar_mult = 1.0
        scenario_wind_mult = 1.0
        scenario_demand_mult = 1.0

        if scenario == "LOW":
            # Low renewables, high demand
            scenario_solar_mult = 0.45
            scenario_wind_mult = 0.40
            scenario_demand_mult = 1.25
        elif scenario == "NORMAL":
            scenario_solar_mult = 1.0
            scenario_wind_mult = 1.0
            scenario_demand_mult = 1.0
        elif scenario == "HIGH":
            # High renewables, mild demand
            scenario_solar_mult = 1.30
            scenario_wind_mult = 1.35
            scenario_demand_mult = 0.88
        elif scenario == "EXTREME":
            # Extreme event / weather shock
            scenario_solar_mult = 0.20
            scenario_wind_mult = 0.25
            scenario_demand_mult = 1.40

        # 1. Solar irradiance (W/m2) and potential (Capacity: 100 MW)
        # Sunlight active between 6:00 and 18:00
        if 6.0 <= h <= 18.0:
            solar_phase = (h - 6.0) / 12.0 * math.pi
            base_irradiance = 980.0 * math.sin(solar_phase)
            # Add minor atmospheric noise
            noise = (math.sin(h * 3.7) + math.cos(h * 1.9)) * 25.0
            irradiance = max(0.0, base_irradiance + noise)
        else:
            irradiance = 0.0

        # Convert irradiance to MW (1000 W/m2 ~ 100 MW demo capacity)
        solar_potential = (irradiance / 1000.0) * 100.0 * scenario_solar_mult

        # 2. Wind speed (m/s) and potential (Capacity: 80 MW)
        # Wind tends to be slightly higher at night / late afternoon
        wind_base_speed = 7.5 + 2.5 * math.sin((h + 4.0) / 24.0 * 2.0 * math.pi)
        wind_noise = math.sin(h * 2.3) * 1.2
        wind_speed = max(0.5, wind_base_speed + wind_noise)

        # Standard cubic wind power curve approximation with cut-in (3 m/s) and rated (12 m/s)
        if wind_speed < 3.0:
            wind_p_norm = 0.0
        elif wind_speed > 22.0:
            wind_p_norm = 0.0 # Cut-out high wind
        elif wind_speed >= 12.0:
            wind_p_norm = 1.0
        else:
            wind_p_norm = ((wind_speed - 3.0) / (12.0 - 3.0)) ** 2.2
        
        wind_potential = wind_p_norm * 80.0 * scenario_wind_mult

        # 3. Ambient temperature (C)
        temp_base = 22.0 + 8.0 * math.sin((h - 9.0) / 24.0 * 2.0 * math.pi)

        # 4. Electricity Demand (Demo nominal 120 - 180 MW)
        # Typical dual peak: Morning peak around 10:00, Evening peak around 19:30
        peak1 = 30.0 * math.exp(-((h - 10.5) ** 2) / 7.0)
        peak2 = 45.0 * math.exp(-((h - 19.5) ** 2) / 6.0)
        night_trough = 15.0 * math.sin((h - 4.0) / 24.0 * 2.0 * math.pi)
        nominal_demand = 125.0 + peak1 + peak2 + night_trough
        demand_mw = nominal_demand * scenario_demand_mult

        # Apply What-If overrides if provided
        if overrides:
            solar_potential *= overrides.solar_scaling_factor
            wind_potential *= overrides.wind_scaling_factor
            demand_mw *= overrides.demand_scaling_factor

            # Emergency injections
            if overrides.emergency_event == "SOLAR_DROP":
                solar_potential *= 0.10
                irradiance *= 0.10
            elif overrides.emergency_event == "WIND_DROP":
                wind_potential *= 0.05
                wind_speed = 1.2
            elif overrides.emergency_event == "DEMAND_SPIKE":
                demand_mw *= 1.45

        # Clamp physically realistic bounds
        solar_potential = round(max(0.0, min(100.0, solar_potential)), 2)
        wind_potential = round(max(0.0, min(80.0, wind_potential)), 2)
        demand_mw = round(max(50.0, min(240.0, demand_mw)), 2)

        return SystemTelemetry(
            timestamp_hour=round(h, 2),
            solar_irradiance_w_m2=round(irradiance, 1),
            wind_speed_m_s=round(wind_speed, 2),
            temperature_c=round(temp_base, 1),
            solar_potential_mw=solar_potential,
            wind_potential_mw=wind_potential,
            base_demand_mw=demand_mw,
            active_scenario=scenario
        )
