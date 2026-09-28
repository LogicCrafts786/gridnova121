import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { LineChart, Sun, Wind, Zap, AlertCircle, Info } from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface ForecastViewProps {
  systemState: SystemStateResponse;
}

export const ForecastView: React.FC<ForecastViewProps> = ({ systemState }) => {
  const { forecast, telemetry } = systemState;
  const [activeMetric, setActiveMetric] = useState<'demand' | 'solar' | 'wind'>('demand');

  // Prepare chart series with uncertainty spreads
  const chartData = forecast.steps.map(s => ({
    hour: `${String(s.hour).padStart(2, '0')}:00`,
    demand_expected: s.demand_expected_mw,
    demand_lower: s.demand_lower_mw,
    demand_upper: s.demand_upper_mw,
    demand_spread: [s.demand_lower_mw, s.demand_upper_mw],

    solar_expected: s.solar_expected_mw,
    solar_lower: s.solar_lower_mw,
    solar_upper: s.solar_upper_mw,
    solar_spread: [s.solar_lower_mw, s.solar_upper_mw],

    wind_expected: s.wind_expected_mw,
    wind_lower: s.wind_lower_mw,
    wind_upper: s.wind_upper_mw,
    wind_spread: [s.wind_lower_mw, s.wind_upper_mw]
  }));

  const metricConfig = {
    demand: {
      title: 'Electricity Demand Forecast',
      unit: 'MW',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.15)',
      expectedKey: 'demand_expected',
      lowerKey: 'demand_lower',
      upperKey: 'demand_upper',
      currentVal: telemetry.base_demand_mw,
      icon: Zap
    },
    solar: {
      title: 'Solar PV Potential Forecast',
      unit: 'MW',
      color: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.15)',
      expectedKey: 'solar_expected',
      lowerKey: 'solar_lower',
      upperKey: 'solar_upper',
      currentVal: telemetry.solar_potential_mw,
      icon: Sun
    },
    wind: {
      title: 'Wind Farm Generation Forecast',
      unit: 'MW',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.15)',
      expectedKey: 'wind_expected',
      lowerKey: 'wind_lower',
      upperKey: 'wind_upper',
      currentVal: telemetry.wind_potential_mw,
      icon: Wind
    }
  };

  const currentCfg = metricConfig[activeMetric];

  return (
    <div className="space-y-4">
      {/* Honesty Banner */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <b className="text-slate-100 font-bold">FORECAST MODE: DEMO</b> — Trained Ridge ML regression models with empirical P10/P90 residual confidence intervals.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span>Confidence: <b className="text-emerald-400">{(forecast.confidence_score * 100).toFixed(0)}%</b></span>
          <span>MAPE: <b className="text-cyan-300">{forecast.mape_pct.toFixed(1)}%</b></span>
          <span>Horizon: <b className="text-slate-200">{forecast.horizon_hours}h ahead</b></span>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex items-center gap-2">
        {(['demand', 'solar', 'wind'] as const).map(key => {
          const cfg = metricConfig[key];
          const Icon = cfg.icon;
          const isActive = activeMetric === key;
          return (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-900 border-cyan-500/60 text-slate-100 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
              <span className="capitalize">{key}</span>
              <span className="font-mono text-[11px] ml-1 px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {cfg.currentVal.toFixed(1)} MW
              </span>
            </button>
          );
        })}
      </div>

      {/* Main 24h Area Chart with P10/P90 Bands */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-100">{currentCfg.title} (24-Hour Horizon)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Center line represents expected value (P50); shaded envelope displays 90% confidence range [P10, P90].
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ backgroundColor: currentCfg.color }} />
              <span className="text-slate-300 text-[11px]">Expected Value</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: currentCfg.fillColor }} />
              <span className="text-slate-300 text-[11px]">Uncertainty Band [P10 - P90]</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentCfg.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={currentCfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit=" MW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toFixed(1)} MW`,
                  name === currentCfg.expectedKey ? 'Expected Value' : name === currentCfg.lowerKey ? 'P10 Lower' : 'P90 Upper'
                ]}
              />
              {/* Uncertainty Upper Bound Envelope */}
              <Area
                type="monotone"
                dataKey={currentCfg.upperKey}
                stroke="transparent"
                fill={currentCfg.fillColor}
              />
              {/* Expected Value Main Line */}
              <Area
                type="monotone"
                dataKey={currentCfg.expectedKey}
                stroke={currentCfg.color}
                strokeWidth={2.5}
                fill="url(#metricGradient)"
              />
              {/* Uncertainty Lower Bound */}
              <Area
                type="monotone"
                dataKey={currentCfg.lowerKey}
                stroke="transparent"
                fill="#0f172a"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
