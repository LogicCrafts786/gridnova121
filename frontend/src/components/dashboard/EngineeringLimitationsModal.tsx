import React from 'react';
import { X, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Code, Lock } from 'lucide-react';

interface EngineeringLimitationsModalProps {
  onClose: () => void;
}

export const EngineeringLimitationsModal: React.FC<EngineeringLimitationsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel rounded-2xl p-6 border border-cyan-500/40 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">ENGINEERING LIMITATIONS & SAFETY DISCLAIMER</h2>
              <span className="text-xs text-amber-400 font-mono">Academic Research & SIH Decision-Support Prototype</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 text-xs leading-relaxed text-slate-300">
          {/* Core Disclaimer Box */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
            <p className="font-semibold">
              "This prototype is a simulation and decision-support demonstration. It is not connected to a real electrical grid and must not be used for direct grid control."
            </p>
          </div>

          {/* Section 1: Non-Claims & Scientific Honesty */}
          <div>
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              1. Non-Claims & Scientific Honesty
            </h4>
            <p className="text-slate-400 mb-2">
              To preserve utmost scientific rigor and academic integrity, the system explicitly does NOT claim:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><b>No Real-World Direct Control:</b> The system does not interface with physical actuators or live breakers.</li>
              <li><b>No Quantum Speedup or Superiority:</b> The hybrid quantum optimizer utilizes a classical CPU statevector simulator of transverse-field quantum annealing (QUBO/QAOA). Runtime comparisons are purely algorithmic and not proof of quantum hardware speedup.</li>
              <li><b>No Guaranteed Forecast Accuracy:</b> AI forecasting models are baseline demonstrational models trained on synthetic diurnal telemetry.</li>
              <li><b>No Safety Warranties:</b> All scheduling recommendations require human transmission operator verification.</li>
            </ul>
          </div>

          {/* Section 2: Mathematical Electrical Power Balance Formulation */}
          <div>
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              2. Electrical Model Formulation
            </h4>
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-cyan-300">
              {"P_{solar} + P_{wind} + \\sum_{i=1}^3 P_i + P_{import} + P_{discharge} = P_{demand} + P_{charge} + P_{export} + P_{curtailment}"}
            </div>
            <p className="text-slate-400 mt-1.5">
              The prototype employs an active-power balance model. Real transmission operations require extension to:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] text-slate-300">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                • AC Optimal Power Flow (AC-OPF)
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                • Voltage & Reactive Power (VAR) Limits
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                • Line Impedance & Thermal Congestion
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                • Dynamic Frequency & Inertia Response
              </div>
            </div>
          </div>

          {/* Section 3: Production Deployment & Cybersecurity Prerequisites */}
          <div>
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              3. Production Deployment & Cybersecurity Architecture Requirements
            </h4>
            <p className="text-slate-400 mb-1">
              Transferring this prototype to a physical utility-scale deployment would mandate:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><b>Authentication & RBAC:</b> Multi-factor authentication, granular role-based access for operators vs analysts.</li>
              <li><b>Zero-Trust Network:</b> Mutual TLS (mTLS) with SCADA / IEC 61850 protocol encryption and air-gapped demilitarized zones (DMZ).</li>
              <li><b>Tamper-Proof Audit Logging:</b> Cryptographically hashed immutable logs of all optimization runs and dispatch overrides.</li>
              <li><b>Hardware Interlocks:</b> Hardwired analog under-frequency / over-voltage trip relays that bypass all software decision layers.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-xs transition-colors"
          >
            I Understand & Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
