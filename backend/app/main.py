from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from app.models.schemas import (
    SystemStateResponse, ScenarioType, WhatIfOverrides, OptimizationWeights
)
from app.services.grid_controller import GridController

app = FastAPI(
    title="AI + Hybrid Quantum Microgrid Digital Twin API",
    description="Backend API powering the 3D Digital Twin, AI Forecasting, Risk Engine, and Hybrid Quantum Optimization Pipeline.",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

controller = GridController()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "AI + Hybrid Quantum Energy Management System",
        "mode": "DEMO / SIMULATION MODE"
    }

@app.get("/api/state", response_model=SystemStateResponse)
def get_system_state():
    """Returns current end-to-end calculated microgrid state."""
    return controller.execute_pipeline()

@app.post("/api/reoptimize", response_model=SystemStateResponse)
def reoptimize():
    """Forces re-optimization through the entire connected pipeline."""
    return controller.reoptimize()

@app.post("/api/scenario/{scenario}", response_model=SystemStateResponse)
def set_scenario(scenario: ScenarioType):
    """Switches operational scenario and recalculates full pipeline."""
    if scenario not in ["LOW", "NORMAL", "HIGH", "EXTREME"]:
        raise HTTPException(status_code=400, detail="Invalid scenario type.")
    controller.active_scenario = scenario
    controller.overrides.forced_scenario = scenario
    return controller.execute_pipeline()

@app.post("/api/whatif", response_model=SystemStateResponse)
def apply_whatif(overrides: WhatIfOverrides):
    """Applies What-If disturbance sliders/toggles and recalculates pipeline."""
    controller.overrides = overrides
    return controller.execute_pipeline()

@app.post("/api/emergency/{event}", response_model=SystemStateResponse)
def trigger_emergency(event: str):
    """
    Activates quick emergency injections:
    SOLAR_DROP, WIND_DROP, DEMAND_SPIKE, G1_FAILURE, G2_FAILURE, G3_FAILURE, BATTERY_FAILURE, GRID_FAILURE, CLEAR
    """
    ev = event.upper()
    if ev == "CLEAR":
        controller.overrides.emergency_event = None
        for g in controller.generators:
            g.forced_offline = False
            g.is_available = True
        controller.battery.forced_offline = False
        controller.battery.is_available = True
        controller.grid.forced_offline = False
        controller.grid.is_available = True
    elif ev in ["SOLAR_DROP", "WIND_DROP", "DEMAND_SPIKE"]:
        controller.overrides.emergency_event = ev
    elif ev == "G1_FAILURE":
        controller.generators[0].forced_offline = True
        controller.generators[0].is_available = False
        controller.overrides.g1_available = False
        controller.overrides.emergency_event = "G1_FAILURE"
    elif ev == "G2_FAILURE":
        controller.generators[1].forced_offline = True
        controller.generators[1].is_available = False
        controller.overrides.g2_available = False
        controller.overrides.emergency_event = "G2_FAILURE"
    elif ev == "G3_FAILURE":
        controller.generators[2].forced_offline = True
        controller.generators[2].is_available = False
        controller.overrides.g3_available = False
        controller.overrides.emergency_event = "G3_FAILURE"
    elif ev == "BATTERY_FAILURE":
        controller.battery.forced_offline = True
        controller.battery.is_available = False
        controller.overrides.battery_available = False
        controller.overrides.emergency_event = "BATTERY_FAILURE"
    elif ev == "GRID_FAILURE":
        controller.grid.forced_offline = True
        controller.grid.is_available = False
        controller.overrides.grid_available = False
        controller.overrides.emergency_event = "GRID_FAILURE"
    else:
        raise HTTPException(status_code=400, detail="Unknown emergency event code.")

    return controller.execute_pipeline()

@app.post("/api/step", response_model=SystemStateResponse)
def step_simulation(delta_hours: float = 1.0):
    """Advances simulated time by delta_hours and updates battery SOC."""
    return controller.step_time(delta_hours)

@app.post("/api/reset", response_model=SystemStateResponse)
def reset_system():
    """Resets system to default pristine condition."""
    controller.reset_state()
    return controller.execute_pipeline()

@app.post("/api/weights", response_model=SystemStateResponse)
def update_weights(weights: OptimizationWeights):
    """Updates multi-objective optimization weights."""
    controller.weights = weights
    return controller.execute_pipeline()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
