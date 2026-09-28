import React, { useState, useEffect } from 'react';
import {
  Activity, LineChart, ShieldAlert, Cpu, CheckCircle2, Lightbulb,
  Sliders, Maximize2, Minimize2, Compass, Layers, ShieldCheck
} from 'lucide-react';
import { SystemStateResponse, ScenarioType, WhatIfOverrides } from './types/api';
import { ApiService } from './services/api';
import { TopNavBar } from './components/header/TopNavBar';
import { PipelineDiagram } from './components/pipeline/PipelineDiagram';
import { MicrogridCanvas, CameraPreset } from './components/three/MicrogridCanvas';
import { AssetInspectorModal } from './components/three/AssetInspectorModal';
import { LiveStatusView } from './components/dashboard/LiveStatusView';
import { DataAndForecastView } from './components/dashboard/DataAndForecastView';
import { ScenariosUncertaintyView } from './components/dashboard/ScenariosUncertaintyView';
import { RiskMatrixView } from './components/dashboard/RiskMatrixView';
import { ResourceAvailabilityView } from './components/dashboard/ResourceAvailabilityView';
import { UnitCommitmentDispatchView } from './components/dashboard/UnitCommitmentDispatchView';
import { QuantumStudioView } from './components/dashboard/QuantumStudioView';
import { FeasibilityView } from './components/dashboard/FeasibilityView';
import { ExplainabilityView } from './components/dashboard/ExplainabilityView';
import { WhatIfSandbox } from './components/dashboard/WhatIfSandbox';
import { FailureSuiteView } from './components/dashboard/FailureSuiteView';
import { LiveGridMonitorView } from './components/dashboard/LiveGridMonitorView';
import { EngineeringLimitationsModal } from './components/dashboard/EngineeringLimitationsModal';
import { DemoTourModal } from './components/dashboard/DemoTourModal';

type ActiveTab =
  | 'overview'
  | 'data_forecast'
  | 'scenarios'
  | 'risk'
  | 'resources'
  | 'uc_ed'
  | 'quantum'
  | 'validation'
  | 'schedule'
  | 'digital_twin'
  | 'whatif'
  | 'monitor';

export const App: React.FC = () => {
  const [systemState, setSystemState] = useState<SystemStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [performanceMode, setPerformanceMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ type: string; data?: any } | null>(null);
  const [showDisclaimers, setShowDisclaimers] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationToast, setOptimizationToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Timer loop for real-time simulation
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const updated = await ApiService.stepSimulation(0.5);
          setSystemState(updated);
        } catch (err: any) {
          console.error("Simulation loop error:", err);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Initial load
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        const data = await ApiService.getState();
        setSystemState(data);
        setError(null);
      } catch (err: any) {
        setError(`Initialization error: ${err.message}.`);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // Action Handlers
  const handleReoptimize = async () => {
    try {
      setIsOptimizing(true);
      setError(null);
      const data = await ApiService.reoptimize();
      setSystemState(data);
      const msg = data.optimization_status_message || "Optimization completed — feasible schedule found.";
      setOptimizationToast({ message: msg, visible: true });
      setTimeout(() => {
        setOptimizationToast(prev => prev ? { ...prev, visible: false } : null);
      }, 6000);
    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(`Optimization failed: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleStepTime = async () => {
    try {
      const data = await ApiService.stepSimulation(1.0);
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    try {
      const data = await ApiService.resetSystem();
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectScenario = async (scenario: ScenarioType) => {
    try {
      const data = await ApiService.setScenario(scenario);
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleApplyWhatIf = async (overrides: WhatIfOverrides) => {
    try {
      const data = await ApiService.applyWhatIf(overrides);
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTriggerEmergency = async (event: string) => {
    try {
      const data = await ApiService.triggerEmergency(event);
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleToggleTripAsset = async (assetId: string) => {
    try {
      let eventCode = `${assetId}_FAILURE`;
      if (assetId === 'SOLAR') eventCode = 'SOLAR_DROP';
      if (assetId === 'WIND') eventCode = 'WIND_DROP';
      const data = await ApiService.triggerEmergency(eventCode);
      setSystemState(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <div className="text-center">
          <h2 className="font-bold text-sm tracking-wider uppercase text-cyan-300">Initializing Grid Nova Digital Twin</h2>
          <p className="text-xs text-slate-400 mt-1">Connecting to Optimization & Quantum Simulation Engine...</p>
        </div>
      </div>
    );
  }

  if (error || !systemState) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="p-6 rounded-2xl bg-red-950/60 border border-red-500/50 max-w-lg text-center space-y-3">
          <h2 className="font-bold text-base text-red-200">Connection Failed</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const cameraPresetButtons: { id: CameraPreset; label: string }[] = [
    { id: 'overview', label: 'Bird\'s Eye' },
    { id: 'solar', label: 'Solar PV' },
    { id: 'wind', label: 'Wind Array' },
    { id: 'battery', label: 'BESS' },
    { id: 'thermal', label: 'Thermal G1-3' },
    { id: 'substation', label: 'Substation' },
    { id: 'city', label: 'City Load' },
    { id: 'control_center', label: 'Control Center' },
  ];

  const dashboardTabs: { id: ActiveTab; label: string; icon: any }[] = [
    { id: 'overview', label: '1. Overview', icon: Activity },
    { id: 'data_forecast', label: '2. Data & Forecast', icon: LineChart },
    { id: 'scenarios', label: '3. Scenarios & Uncertainty', icon: Layers },
    { id: 'risk', label: '4. Risk Analysis', icon: ShieldAlert },
    { id: 'resources', label: '5. Resource Availability', icon: ShieldCheck },
    { id: 'uc_ed', label: '6. UC + ED + Storage', icon: Cpu },
    { id: 'quantum', label: '7. Hybrid Quantum', icon: Cpu },
    { id: 'validation', label: '8. Feasibility Validation', icon: CheckCircle2 },
    { id: 'schedule', label: '9. Final Schedule', icon: Lightbulb },
    { id: 'digital_twin', label: '10. 3D Digital Twin', icon: Compass },
    { id: 'whatif', label: '11. What-If & Failure Suite', icon: Sliders },
    { id: 'monitor', label: '12. Live Grid Monitor', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <TopNavBar
        systemState={systemState}
        isRunning={isRunning}
        isOptimizing={isOptimizing}
        performanceMode={performanceMode}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onReoptimize={handleReoptimize}
        onStepTime={handleStepTime}
        onReset={handleReset}
        onTogglePerformance={() => setPerformanceMode(!performanceMode)}
        onOpenDisclaimers={() => setShowDisclaimers(true)}
        onOpenDemoTour={() => setShowDemoTour(true)}
      />

      {/* Optimization Completed Toast Notification */}
      {optimizationToast?.visible && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{optimizationToast.message}</span>
          <button
            onClick={() => setOptimizationToast(null)}
            className="ml-2 px-1.5 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-[10px] uppercase font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Transient Action Error Notification */}
      {error && (
        <div className="bg-red-950/90 border-b border-red-500/50 px-4 py-1.5 text-xs text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[10px] text-red-300 hover:text-white uppercase font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* 14-Stage Connected Pipeline Flow Bar */}
      <PipelineDiagram systemState={systemState} />

      {/* Main Workspace Split View */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* 3D Digital Twin Viewport */}
        <section
          className={`relative transition-all duration-300 ${
            canvasFullscreen || activeTab === 'digital_twin'
              ? 'w-full h-full fixed inset-0 z-50 bg-slate-950'
              : 'w-full xl:w-[50%] h-[420px] xl:h-[calc(100vh-140px)] border-b xl:border-b-0 xl:border-r border-slate-800'
          }`}
        >
          {/* 3D Canvas */}
          <MicrogridCanvas
            systemState={systemState}
            cameraPreset={cameraPreset}
            performanceMode={performanceMode}
            onSelectAsset={(type, data) => setSelectedAsset({ type, data })}
          />

          {/* Floating Camera Presets Bar */}
          <div className="absolute top-3 left-3 z-10 glass-panel rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto max-w-[90%] shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase flex items-center gap-1 shrink-0">
              <Compass className="w-3 h-3 text-cyan-400" />
              Camera:
            </span>
            {cameraPresetButtons.map(cp => (
              <button
                key={cp.id}
                onClick={() => setCameraPreset(cp.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
                  cameraPreset === cp.id
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cp.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (activeTab === 'digital_twin') {
                  setActiveTab('overview');
                  setCanvasFullscreen(false);
                } else {
                  setCanvasFullscreen(!canvasFullscreen);
                }
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 ml-1 shrink-0"
              title={canvasFullscreen || activeTab === 'digital_twin' ? "Exit Fullscreen" : "Fullscreen 3D Twin"}
            >
              {canvasFullscreen || activeTab === 'digital_twin' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 3D Legend Bar Bottom Left */}
          <div className="absolute bottom-3 left-3 z-10 glass-panel-subtle rounded-lg px-3 py-1.5 text-[10px] flex items-center gap-3 text-slate-300 hidden sm:flex">
            <span className="font-semibold text-slate-400">Power Streams:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Solar/Wind</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Thermal Gen</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Storage Chg/Dis</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Grid Tie</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Load Feeder</span>
          </div>

          {/* Clicked 3D Asset Telemetry Overlay */}
          {selectedAsset && (
            <AssetInspectorModal
              assetType={selectedAsset.type}
              assetData={selectedAsset.data}
              systemState={systemState}
              onClose={() => setSelectedAsset(null)}
              onToggleTrip={handleToggleTripAsset}
            />
          )}
        </section>

        {/* Dashboard & Engineering Control Panel */}
        <section className={`flex flex-col h-auto xl:h-[calc(100vh-140px)] bg-slate-950/95 overflow-hidden ${
          activeTab === 'digital_twin' ? 'hidden' : 'w-full xl:w-[50%]'
        }`}>
          {/* Dashboard Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 px-2 overflow-x-auto bg-slate-900/60 shrink-0 select-none">
            {dashboardTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300 bg-slate-800/40 shadow-inner'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dashboard Content Container */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="p-4 space-y-4">
                <LiveStatusView
                  systemState={systemState}
                  onSelectAsset={(type, data) => setSelectedAsset({ type, data })}
                />
              </div>
            )}

            {activeTab === 'data_forecast' && (
              <DataAndForecastView
                systemState={systemState}
                onApplyOverrides={handleApplyWhatIf}
                onResetDefaults={handleReset}
              />
            )}

            {activeTab === 'scenarios' && (
              <ScenariosUncertaintyView
                systemState={systemState}
                onSelectScenario={handleSelectScenario}
              />
            )}

            {activeTab === 'risk' && (
              <div className="p-4 space-y-4">
                <RiskMatrixView
                  systemState={systemState}
                  onSelectScenario={handleSelectScenario}
                />
              </div>
            )}

            {activeTab === 'resources' && (
              <ResourceAvailabilityView
                systemState={systemState}
                onToggleTrip={handleToggleTripAsset}
              />
            )}

            {activeTab === 'uc_ed' && (
              <UnitCommitmentDispatchView systemState={systemState} />
            )}

            {activeTab === 'quantum' && (
              <div className="p-4 space-y-4">
                <QuantumStudioView systemState={systemState} />
              </div>
            )}

            {activeTab === 'validation' && (
              <div className="p-4 space-y-4">
                <FeasibilityView systemState={systemState} />
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="p-4 space-y-4">
                <ExplainabilityView systemState={systemState} />
              </div>
            )}

            {activeTab === 'whatif' && (
              <div className="space-y-4">
                <FailureSuiteView
                  systemState={systemState}
                  onApplyWhatIf={handleApplyWhatIf}
                  onTriggerEmergency={handleTriggerEmergency}
                  onReset={handleReset}
                />
                <div className="px-4 pb-4">
                  <WhatIfSandbox
                    systemState={systemState}
                    onApplyWhatIf={handleApplyWhatIf}
                    onTriggerEmergency={handleTriggerEmergency}
                    onReset={handleReset}
                  />
                </div>
              </div>
            )}

            {activeTab === 'monitor' && (
              <LiveGridMonitorView
                systemState={systemState}
                onReoptimize={handleReoptimize}
              />
            )}
          </div>
        </section>
      </main>

      {/* 60-Second Demo Mode Tour Modal */}
      <DemoTourModal
        isOpen={showDemoTour}
        onClose={() => setShowDemoTour(false)}
        onRunOptimization={handleReoptimize}
        onNavigateTab={(tabId) => setActiveTab(tabId as ActiveTab)}
      />

      {/* Engineering Limitations & Disclaimers Modal */}
      {showDisclaimers && (
        <EngineeringLimitationsModal onClose={() => setShowDisclaimers(false)} />
      )}
    </div>
  );
};

export default App;
