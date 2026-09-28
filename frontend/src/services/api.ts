import {
  SystemStateResponse, ScenarioType, WhatIfOverrides, OptimizationWeights
} from '../types/api';
import { localOptimizer } from './localOptimizer';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const ApiService = {
  async getState(): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, falling back to local deterministic optimizer:", err.message);
      return localOptimizer.getState();
    }
  },

  async reoptimize(): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/reoptimize`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, executing local deterministic re-optimization:", err.message);
      return localOptimizer.reoptimize();
    }
  },

  async setScenario(scenario: ScenarioType): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/scenario/${scenario}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, applying scenario locally:", err.message);
      return localOptimizer.setScenario(scenario);
    }
  },

  async applyWhatIf(overrides: WhatIfOverrides): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, applying What-If locally:", err.message);
      return localOptimizer.applyWhatIf(overrides);
    }
  },

  async triggerEmergency(event: string): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/emergency/${encodeURIComponent(event)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, triggering emergency contingency locally:", err.message);
      return localOptimizer.triggerEmergency(event);
    }
  },

  async stepSimulation(deltaHours: number = 1.0): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/step?delta_hours=${deltaHours}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, stepping simulation locally:", err.message);
      return localOptimizer.stepSimulation(deltaHours);
    }
  },

  async resetSystem(): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, resetting system locally:", err.message);
      return localOptimizer.resetSystem();
    }
  },

  async updateWeights(weights: OptimizationWeights): Promise<SystemStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      localOptimizer.syncState(data);
      return data;
    } catch (err: any) {
      console.warn("Backend API unavailable, updating weights locally:", err.message);
      return localOptimizer.updateWeights(weights);
    }
  }
};
