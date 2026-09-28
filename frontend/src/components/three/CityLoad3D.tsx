import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SystemTelemetry, ForecastResponse } from '../../types/api';

interface CityLoad3DProps {
  telemetry: SystemTelemetry;
  forecast: ForecastResponse;
  performanceMode: boolean;
  onSelect: () => void;
}

export const CityLoad3D: React.FC<CityLoad3DProps> = ({
  telemetry,
  forecast,
  performanceMode,
  onSelect
}) => {
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const demandMW = telemetry.base_demand_mw;
  const nextHourForecastMW = forecast.steps.length > 1 ? forecast.steps[1].demand_expected_mw : demandMW;

  // Pulse animation proportional to demand stress
  useFrame((state) => {
    if (glowMeshRef.current) {
      const t = state.clock.getElapsedTime();
      const intensity = 0.2 + (demandMW / 200.0) * 0.35;
      const pulse = 1.0 + Math.sin(t * (demandMW > 160 ? 5 : 2.5)) * 0.06;
      glowMeshRef.current.scale.set(pulse, 1, pulse);
    }
  });

  // Procedural city building configurations
  const buildings = [
    { pos: [-5, 0, -4] as [number, number, number], size: [3.2, 9.0, 3.2] as [number, number, number], color: "#1e293b", winColor: "#38bdf8" },
    { pos: [0, 0, -5] as [number, number, number], size: [4.0, 14.0, 3.5] as [number, number, number], color: "#0f172a", winColor: "#facc15" },
    { pos: [5, 0, -4] as [number, number, number], size: [3.0, 11.0, 3.8] as [number, number, number], color: "#1e293b", winColor: "#38bdf8" },
    { pos: [-4.5, 0, 1.5] as [number, number, number], size: [3.5, 7.5, 3.5] as [number, number, number], color: "#334155", winColor: "#a855f7" },
    { pos: [0, 0, 1.0] as [number, number, number], size: [4.2, 17.5, 4.0] as [number, number, number], color: "#090d16", winColor: "#38bdf8" }, // Main center skyscraper
    { pos: [5.2, 0, 2.0] as [number, number, number], size: [3.6, 8.5, 3.2] as [number, number, number], color: "#1e293b", winColor: "#facc15" },
    { pos: [-4.0, 0, 6.5] as [number, number, number], size: [3.2, 6.0, 3.0] as [number, number, number], color: "#334155", winColor: "#38bdf8" },
    { pos: [1.0, 0, 7.0] as [number, number, number], size: [4.0, 9.5, 3.5] as [number, number, number], color: "#1e293b", winColor: "#facc15" },
    { pos: [5.5, 0, 7.0] as [number, number, number], size: [3.0, 5.0, 3.0] as [number, number, number], color: "#475569", winColor: "#38bdf8" },
  ];

  return (
    <group position={[24, 0, 18]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* City Asphalt Base Plate */}
      <mesh position={[0, -0.05, 1]} receiveShadow>
        <boxGeometry args={[18, 0.1, 20]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* Main Tower Box */}
          <mesh position={[0, b.size[1] / 2, 0]} castShadow={!performanceMode}>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.color}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Glowing Window Strips (Simulated) */}
          <mesh position={[0, b.size[1] / 2, 0]}>
            <boxGeometry args={[b.size[0] + 0.04, b.size[1] * 0.85, b.size[2] + 0.04]} />
            <meshBasicMaterial
              color={b.winColor}
              wireframe
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* Rooftop HVAC and Spire */}
          <mesh position={[0, b.size[1] + 0.4, 0]}>
            <boxGeometry args={[b.size[0] * 0.6, 0.8, b.size[2] * 0.6]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          {i === 4 && (
            <mesh position={[0, b.size[1] + 2.5, 0]}>
              <cylinderGeometry args={[0.04, 0.15, 4.0, 6]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          )}
        </group>
      ))}

      {/* Street Level Energy Consumption Aura */}
      <mesh ref={glowMeshRef} position={[0, 0.02, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[17.5, 19.5]} />
        <meshBasicMaterial
          color={demandMW > 160 ? "#f59e0b" : "#38bdf8"}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating HUD Label */}
      <Html position={[0, 19.5, 1]} center distanceFactor={26} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className="px-2.5 py-1.5 rounded-md text-xs font-semibold backdrop-blur-md border shadow-xl bg-slate-900/85 border-amber-400/50 text-amber-300 transition-transform group-hover:scale-105 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold text-slate-100">METROPOLITAN LOAD CENTER</span>
              <span className="text-slate-400 font-mono text-[10px]">|</span>
              <span className="font-mono font-bold text-amber-300">{demandMW.toFixed(1)} MW</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between gap-3">
              <span>Next Hour Forecast: <b className="text-cyan-300 font-mono">{nextHourForecastMW.toFixed(1)} MW</b></span>
              <span className={demandMW > 160 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {demandMW > 165 ? 'CRITICAL PEAK' : demandMW > 140 ? 'ON-PEAK' : 'NORMAL LOAD'}
              </span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};
