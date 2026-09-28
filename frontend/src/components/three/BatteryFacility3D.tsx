import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BatteryConfig, DispatchCandidate } from '../../types/api';

interface BatteryFacility3DProps {
  config: BatteryConfig;
  schedule: DispatchCandidate;
  performanceMode: boolean;
  onSelect: () => void;
}

export const BatteryFacility3D: React.FC<BatteryFacility3DProps> = ({
  config,
  schedule,
  performanceMode,
  onSelect
}) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const isOnline = config.is_available && !config.forced_offline;
  const isCharging = isOnline && schedule.battery_charge_mw > 0.5;
  const isDischarging = isOnline && schedule.battery_discharge_mw > 0.5;

  const currentEnergyMWh = (config.current_soc_pct / 100) * config.capacity_mwh;
  const socRatio = Math.max(0, Math.min(1, config.current_soc_pct / 100));

  useFrame((state) => {
    if (pulseRef.current) {
      const t = state.clock.getElapsedTime();
      if (isCharging || isDischarging) {
        pulseRef.current.scale.setScalar(1.0 + Math.sin(t * 4) * 0.08);
      } else {
        pulseRef.current.scale.setScalar(1.0);
      }
    }
  });

  return (
    <group position={[-6, 0, -22]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Foundation Pad */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[14, 0.1, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Grid of Battery Storage Enclosures (Megapacks) */}
      {[-4, -1.3, 1.3, 4].map((x, i) =>
        [-2.5, 2.5].map((z, j) => (
          <group key={`${i}-${j}`} position={[x, 0, z]}>
            {/* Battery Enclosure Container */}
            <mesh position={[0, 1.1, 0]} castShadow={!performanceMode}>
              <boxGeometry args={[2.2, 2.2, 3.8]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            {/* Rooftop HVAC Cooling Pods */}
            <mesh position={[0, 2.3, 0]}>
              <boxGeometry args={[1.6, 0.3, 2.8]} />
              <meshStandardMaterial color="#64748b" roughness={0.5} />
            </mesh>
            {/* High Voltage Status LED Strip */}
            <mesh position={[0, 1.1, 1.92]}>
              <boxGeometry args={[1.8, 0.1, 0.04]} />
              <meshBasicMaterial
                color={
                  !isOnline
                    ? "#ef4444"
                    : isCharging
                    ? "#06b6d4"
                    : isDischarging
                    ? "#10b981"
                    : "#3b82f6"
                }
              />
            </mesh>
          </group>
        ))
      )}

      {/* Central High-Voltage Inverter Skid / Transformer */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[2.2, 3.0, 2.2]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 3D Vertical SOC Level Column Indicator */}
      <group position={[0, 3.0, 0]}>
        {/* Background Column */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 3.0, 16]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={0.7} />
        </mesh>
        {/* Active Fill Column */}
        <mesh position={[0, 1.5 * socRatio, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 3.0 * socRatio, 16]} />
          <meshBasicMaterial
            color={
              config.current_soc_pct < 25
                ? "#ef4444"
                : config.current_soc_pct < 50
                ? "#f59e0b"
                : "#10b981"
            }
          />
        </mesh>
      </group>

      {/* Glowing Energy Aura Disk under center */}
      <mesh ref={pulseRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 4.5, 32]} />
        <meshBasicMaterial
          color={
            !isOnline
              ? "#7f1d1d"
              : isCharging
              ? "#06b6d4"
              : isDischarging
              ? "#10b981"
              : "#1e3a8a"
          }
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating HUD Label */}
      <Html position={[0, 7.5, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-2.5 py-1.5 rounded-md text-xs font-semibold backdrop-blur-md border shadow-xl transition-transform group-hover:scale-105 flex flex-col gap-0.5 ${
            !isOnline
              ? 'bg-red-950/85 border-red-500/50 text-red-300'
              : isCharging
              ? 'bg-cyan-950/85 border-cyan-400/50 text-cyan-300'
              : isDischarging
              ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-300'
              : 'bg-slate-900/85 border-blue-400/50 text-blue-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                !isOnline
                  ? 'bg-red-500'
                  : isCharging
                  ? 'bg-cyan-400 animate-pulse'
                  : isDischarging
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-blue-400'
              }`} />
              <span className="font-bold">BESS (200 MWh)</span>
              <span className="text-slate-400 font-mono text-[10px]">|</span>
              <span className="font-mono font-bold text-slate-100">{config.current_soc_pct.toFixed(1)}% SOC</span>
            </div>
            <div className="text-[10px] text-slate-300 flex items-center justify-between gap-2">
              <span>{currentEnergyMWh.toFixed(1)} MWh</span>
              <span className="font-mono text-cyan-200">
                {isCharging
                  ? `+${schedule.battery_charge_mw.toFixed(1)} MW Chg`
                  : isDischarging
                  ? `-${schedule.battery_discharge_mw.toFixed(1)} MW Dis`
                  : 'Idle Standby'}
              </span>
              <span className="text-slate-400">Degradation: {config.degradation_pct.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};
