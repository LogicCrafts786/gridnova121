import React from 'react';
import {
  CheckCircle2, XCircle, Wrench, ShieldCheck, AlertTriangle, ArrowRight
} from 'lucide-react';
import { SystemStateResponse } from '../../types/api';

interface FeasibilityViewProps {
  systemState: SystemStateResponse;
}

export const FeasibilityView: React.FC<FeasibilityViewProps> = ({ systemState }) => {
  const { validation, repair, final_schedule } = systemState;

  return (
    <div className="space-y-4">
      {/* Top Status Card */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        validation.is_feasible
          ? 'bg-emerald-950/40 border-emerald-500/40'
          : 'bg-amber-950/40 border-amber-500/40'
      }`}>
        <div className="flex items-center gap-3">
          {validation.is_feasible ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm text-slate-100">
              {validation.is_feasible
                ? 'FEASIBILITY AUDIT: 100% COMPLIANT'
                : 'FEASIBILITY AUDIT: ANOMALIES DETECTED & CLASSICALLY REPAIRED'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {validation.is_feasible
                ? 'Every candidate solution must strictly satisfy all physical laws, technical limits, and reserve criteria.'
                : `${validation.failed_reasons.length} initial constraint violations intercepted and resolved by Classical Refinement Engine.`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Final Schedule Violations</span>
          <span className="font-mono text-xl font-bold text-emerald-400">
            {final_schedule.violations.length} VIOLATIONS
          </span>
        </div>
      </div>

      {/* 10 Fundamental Physical Constraint Checks Table */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800">
        <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Rigorous 10-Point Classical Grid Constraint Audit Checklist
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Constraint Rule</th>
                <th className="py-2.5 px-3">Actual Value</th>
                <th className="py-2.5 px-3">Configured Limit</th>
                <th className="py-2.5 px-3">Deviation</th>
                <th className="py-2.5 px-3">Audit Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {validation.checks.map((check, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{check.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{check.actual_value}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{check.limit_value}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {check.deviation ? (
                      <span className="text-red-400 font-bold">{check.deviation}</span>
                    ) : (
                      <span className="text-slate-500">0.0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {check.satisfied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-500/40">
                        <XCircle className="w-3 h-3 text-red-400" />
                        FAILED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Classical Repair & Refinement Actions Log */}
      {repair.repair_applied && (
        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <h3 className="font-bold text-xs tracking-wider uppercase text-slate-300 mb-3 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            Classical Refinement & Projection Actions Applied ({repair.actions_taken.length} Steps)
          </h3>

          <div className="space-y-2">
            {repair.actions_taken.map((act, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/60 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-200">{act.action}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">
                    <b className="text-slate-300">Engineering Rationale: </b>
                    {act.rationale}
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{act.before_value}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                    {act.after_value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
