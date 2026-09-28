import React, { useState } from 'react';
import {
  X, ArrowRight, ArrowLeft, Play, CheckCircle2,
  Cpu, Layers, ShieldCheck, Activity, Lightbulb, Compass
} from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunOptimization: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onRunOptimization,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to Grid Nova 3D Digital Twin",
      badge: "60-SECOND EXECUTIVE OVERVIEW",
      icon: Activity,
      content: "Grid Nova is an autonomous AI + Hybrid Quantum renewable microgrid decision-support prototype. It solves simultaneous Unit Commitment (UC), Economic Dispatch (ED), battery storage scheduling, and grid constraint balancing in real time.",
      actionLabel: "Next: The 14-Stage Pipeline",
      targetTab: "overview"
    },
    {
      title: "Connected 14-Stage Decision Pipeline",
      badge: "FULL CLOSED-LOOP WORKFLOW",
      icon: Layers,
      content: "Unlike static dashboards, every calculation flows directly into the next: Data → AI Forecast → Uncertainty → Scenarios → Risk Analysis → Resource Availability → UC + ED → Hybrid Quantum QUBO → Classical Validation → Refinement → Explainability → 3D Twin → What-If Simulation → Re-Optimization.",
      actionLabel: "Next: Hybrid Quantum Optimization",
      targetTab: "data_forecast"
    },
    {
      title: "Hybrid Quantum / QUBO Unit Commitment",
      badge: "ALGORITHMIC RIGOR",
      icon: Cpu,
      content: "Generator binary commitment states are mapped onto a Quadratic Unconstrained Binary Optimization (QUBO) problem. A simulated transverse-field quantum annealer evaluates Boltzmann candidate bitstrings, benchmarked directly against classical HiGHS linear programming.",
      actionLabel: "Next: Constraint Validation & Repair",
      targetTab: "quantum"
    },
    {
      title: "Classical Feasibility & Heuristic Repair",
      badge: "ZERO CONSTRAINT VIOLATIONS",
      icon: ShieldCheck,
      content: "All candidate schedules undergo rigorous multi-point validation: power balance equality, generator min/max, ramp rates, spinning reserves (≥ 25 MW), and battery SOC limits. Any violation triggers the Classical Repair Engine to ensure 100% feasibility before dispatch.",
      actionLabel: "Next: Explainability & 3D Twin",
      targetTab: "validation"
    },
    {
      title: "Explainable AI & Interactive 3D Twin",
      badge: "OPERATIONAL TRANSPARENCY",
      icon: Lightbulb,
      content: "Every dispatch decision includes natural-language engineering rationales explaining why generators were fired, battery storage was held, or grid tie transfers occurred. The Three.js 3D twin animates live power streams matching real telemetry.",
      actionLabel: "Finish & Run Live Optimization",
      targetTab: "digital_twin"
    }
  ];

  const currentSlide = slides[step];
  const Icon = currentSlide.icon;

  const handleNext = () => {
    if (step < slides.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      onNavigateTab(slides[nextStep].targetTab);
    } else {
      onRunOptimization();
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      onNavigateTab(slides[prevStep].targetTab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                {currentSlide.badge}
              </span>
              <h3 className="text-base font-bold text-slate-100">{currentSlide.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          {currentSlide.content}
        </p>

        {/* Slide Indicators */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setStep(i);
                onNavigateTab(slides[i].targetTab);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              step === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRunOptimization();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-cyan-900/30 transition-all"
            >
              <span>{currentSlide.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
