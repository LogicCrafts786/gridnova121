# Grid Nova: AI + Hybrid Quantum Renewable Energy Optimization and Real-Time Grid Management System

A connected 3D Digital Twin and decision-support prototype for renewable-energy microgrid optimization.

## Workflow Pipeline
```text
DATA
 ↓
AI FORECAST
 ↓
UNCERTAINTY
 ↓
SCENARIOS
 ↓
RISK ANALYSIS
 ↓
RESOURCE AVAILABILITY
 ↓
UC + ED + STORAGE OPTIMIZATION
 ↓
HYBRID QUANTUM OPTIMIZATION
 ↓
CLASSICAL FEASIBILITY VALIDATION
 ↓
CLASSICAL REFINEMENT
 ↓
EXPLAINABLE FINAL SCHEDULE
 ↓
3D GRID + DASHBOARD
 ↓
WHAT-IF SIMULATION
 ↓
REAL-TIME RE-OPTIMIZATION
 ↓
NEW DATA ↺
```

## Quick Start Guide

### 1. Backend (FastAPI + SciPy HiGHS Solver + QUBO Simulation)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend (React 19 + TypeScript + Vite + Tailwind CSS + Three.js / React Three Fiber)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
```bash
cd frontend
npm run build
npm run preview
```

## System Features
- **Interactive 3D Digital Twin**: Built with React Three Fiber, visualizing dynamic power flows, solar arrays, wind turbines, substations, and battery storage.
- **Hybrid Quantum Optimization**: QUBO formulation of the unit commitment problem with Boltzmann statevector sampling across the $2^3 = 8$ basis state space.
- **Classical LP Dispatch & Solver Benchmark**: SciPy HiGHS continuous linear programming solver comparing exact objectives, solve times, and carbon intensity.
- **Automated Validation & Repair Heuristics**: Enforces power balance equality, generator min/max bounds, ramp rates, spinning reserves, and battery SOC limits.
- **Explainable AI Engine**: Natural language rationale generator breaking down dispatch decisions, grid exchange, battery usage, and renewable curtailment prevention.
- **Client-Side Fallback (`localOptimizer.ts`)**: Built-in deterministic simulation allowing the frontend to operate even when running disconnected from the backend.
