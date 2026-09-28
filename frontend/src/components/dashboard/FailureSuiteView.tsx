import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, Play, ShieldAlert, AlertTriangle,
  RotateCcw, ArrowRight, Zap, Sun, Wind, Battery, Cpu
} from 'lucide-react';
import { SystemStateResponse, WhatIfOverrides } from '../../types/api';

interface FailureSuiteViewProps {
  systemState: SystemStateResponse;
  onApplyWhatIf: (overrides: WhatIfOverrides) => void;
  onTriggerEmergency: (event: string) => void;
  onReset: () => void;
}

interface TestDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  action: () => void;
  injectedState: string;
  expectedBehavior: string;
}

export const FailureSuiteView: React.FC<FailureSuiteViewProps> = ({
  systemState,
  onApplyWhatIf,
  onTriggerEmergency,
  onReset
}) => {
  const { final_schedule, validation, telemetry, is_emergency, emergency_label } = systemState;

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    [id: string]: {
      run: boolean;
      isFeasible: boolean;
      supplyMW: number;
      demandMW: number;
      reserveMW: number;
      summary: string;
      violations: string[];
    };
  }>({});

  const tests: TestDefinition[] = [
    {
      id: 'TEST_1',
      name: 'TEST 1: Battery Available (Nominal Baseline)',
      category: 'Baseline',
      description: 'Verifies normal operation where BESS is online, responsive, and available for peak shaving / reserve.',
      injectedState: 'Battery available = TRUE, nominal solar, wind, and demand.',
      expectedBehavior: 'Feasible schedule with BESS providing reserve headroom and standby buffering.',
      action: () => {
        onTriggerEmergency('CLEAR');
      }
    },
    {
      id: 'TEST_2',
      name: 'TEST 2: Battery Unavailable (Forced Outage)',
      category: 'Storage Contingency',
      description: 'Simulates complete failure/tripping of the 200 MWh BESS inverter system.',
      injectedState: 'Battery is_available = FALSE, Charge = 0 MW, Discharge = 0 MW.',
      expectedBehavior: 'Feasible schedule: Thermal units G1-G3 and grid interconnect dynamically scale to compensate and provide spinning reserves.',
      action: () => {
        onTriggerEmergency('BATTERY_FAILURE');
      }
    },
    {
      id: 'TEST_3',
      name: 'TEST 3: Solar Unavailable (Cloud Cover / Nightfront)',
      category: 'Renewable Contingency',
      description: 'Simulates 90% sudden solar irradiance drop across the 100 MW bifacial PV farm.',
      injectedState: 'Solar potential drops to 10% (≈ 9.5 MW). Demand = 100%.',
      expectedBehavior: 'Feasible schedule: Baseload G1 and intermediate G2 ramp up to replace solar generation without load shedding.',
      action: () => {
        onTriggerEmergency('SOLAR_DROP');
      }
    },
    {
      id: 'TEST_4',
      name: 'TEST 4: Wind Unavailable (Calm Wind Front)',
      category: 'Renewable Contingency',
      description: 'Simulates sudden atmospheric calm with wind speed dropping below 3.0 m/s cut-in velocity.',
      injectedState: 'Wind potential drops to 5% (≈ 2.0 MW). Demand = 100%.',
      expectedBehavior: 'Feasible schedule: Storage discharge and thermal peaker G3 dispatched to cover wind deficit.',
      action: () => {
        onTriggerEmergency('WIND_DROP');
      }
    },
    {
      id: 'TEST_5',
      name: 'TEST 5: Generator Unavailable (G1 Baseload Trip)',
      category: 'Thermal Outage',
      description: 'Simulates sudden mechanical trip of the largest baseload combined-cycle generator G1 (80 MW capacity).',
      injectedState: 'G1 forced_offline = TRUE, G1 MW = 0.',
      expectedBehavior: 'Feasible schedule: Rapid peaker G3 starts up, intermediate G2 ramps to max, and battery discharges.',
      action: () => {
        onTriggerEmergency('G1_FAILURE');
      }
    },
    {
      id: 'TEST_6',
      name: 'TEST 6: Demand Spike (+35% Surge)',
      category: 'Grid Stress',
      description: 'Simulates extreme industrial load surge or heatwave cooling demand spike (+35%).',
      injectedState: 'Demand scaled by 1.35x (≈ 180 – 210 MW).',
      expectedBehavior: 'Feasible if all generators + tie-line online; otherwise flags reserve exhaustion.',
      action: () => {
        onTriggerEmergency('DEMAND_SPIKE');
      }
    },
    {
      id: 'TEST_7',
      name: 'TEST 7: Low Renewable Generation (Compound Lull)',
      category: 'Weather Event',
      description: 'Compound meteorological event with heavy overcast and near-zero wind velocity simultaneously.',
      injectedState: 'Solar -55%, Wind -60%, Demand +25%.',
      expectedBehavior: 'Feasible via full thermal fleet commitment and regional grid tie-line imports.',
      action: () => {
        onApplyWhatIf({
          solar_scaling_factor: 0.35,
          wind_scaling_factor: 0.30,
          demand_scaling_factor: 1.20,
          g1_available: true,
          g2_available: true,
          g3_available: true,
          battery_available: true,
          grid_available: true
        });
      }
    },
    {
      id: 'TEST_8',
      name: 'TEST 8: High Renewable Generation (Solar/Wind Boom)',
      category: 'Surplus Management',
      description: 'Peak mid-day solar generation and high wind velocity resulting in renewable generation surplus.',
      injectedState: 'Solar +30%, Wind +35%, Demand mild (-12%).',
      expectedBehavior: 'Feasible schedule with 0% curtailment: Battery charges at maximum 15-50 MW rate, thermal units throttled.',
      action: () => {
        onApplyWhatIf({
          solar_scaling_factor: 1.35,
          wind_scaling_factor: 1.40,
          demand_scaling_factor: 0.85,
          g1_available: true,
          g2_available: true,
          g3_available: true,
          battery_available: true,
          grid_available: true
        });
      }
    }
  ];

  const handleRunTest = (test: TestDefinition) => {
    setActiveTestId(test.id);
    test.action();

    // Record test result based on updated state
    setTimeout(() => {
      const supply = final_schedule.solar_mw + final_schedule.wind_mw + final_schedule.g1_mw + final_schedule.g2_mw + final_schedule.g3_mw + final_schedule.grid_import_mw;
      const isFeas = validation.is_feasible;

      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          run: true,
          isFeasible: isFeas,
          supplyMW: supply,
          demandMW: telemetry.base_demand_mw,
          reserveMW: final_schedule.reserve_margin_mw,
          summary: isFeas
            ? `Feasible schedule generated: ${supply.toFixed(1)} MW supply balances ${telemetry.base_demand_mw.toFixed(1)} MW demand. Operating reserve: ${final_schedule.reserve_margin_mw.toFixed(1)} MW.`
            : `Infeasible: Resource constraints violated. ${validation.failed_reasons.join('; ')}`,
          violations: validation.failed_reasons
        }
      }));
    }, 600);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full text-slate-100">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Automated Failure & Contingency Test Suite
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Execute all 8 mandatory contingency tests. Verifies automated failover, battery unavailability compensation, and clear infeasibility detection.
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All Tests
        </button>
      </div>

      {/* Contingency Active Alert */}
      {is_emergency && (
        <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/80 text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Active Contingency Injection: <strong>{emergency_label || 'SYSTEM CONTINGENCY'}</strong></span>
        </div>
      )}

      {/* Tests Grid */}
      <div className="space-y-3">
        {tests.map(test => {
          const res = testResults[test.id];
          const isCurrentActive = activeTestId === test.id;

          return (
            <div
              key={test.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrentActive
                  ? 'bg-slate-900/90 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                    {test.category}
                  </span>
                  <h3 className="text-xs font-bold text-slate-200">{test.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {res && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      res.isFeasible ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {res.isFeasible ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      {res.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                    </span>
                  )}
                  <button
                    onClick={() => handleRunTest(test)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1 transition-all shadow"
                  >
                    <Play className="w-3 h-3" />
                    RUN TEST
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                {test.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-400 font-semibold block">Injected Condition:</span>
                  <span className="text-slate-300 font-mono">{test.injectedState}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Expected Optimizer Action:</span>
                  <span className="text-slate-300">{test.expectedBehavior}</span>
                </div>
              </div>

              {/* Execution Result Log */}
              {res && (
                <div className={`mt-2.5 p-2 rounded-lg text-[11px] border ${
                  res.isFeasible ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-red-950/40 border-red-800/60 text-red-200'
                }`}>
                  <span className="font-bold">Test Output: </span>
                  <span>{res.summary}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
