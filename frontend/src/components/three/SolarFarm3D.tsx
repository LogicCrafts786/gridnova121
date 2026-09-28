import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RenewableConfig, SystemTelemetry } from '../../types/api';

interface SolarFarm3DProps {
  config: RenewableConfig;
  telemetry: SystemTelemetry;
  performanceMode: boolean;
  onSelect: () => void;
}

export const SolarFarm3D: React.FC<SolarFarm3DProps> = ({
  config,
  telemetry,
  performanceMode,
  onSelect
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rows = performanceMode ? 4 : 7;
  const cols = performanceMode ? 6 : 10;

  // Active output
  const outputMW = config.current_mw;
  const isOnline = config.is_available && !config.forced_offline && outputMW > 0.1;
  const sunAngle = (telemetry.timestamp_hour - 6) / 12 * Math.PI;
  const tilt = Math.max(-0.4, Math.min(0.4, (telemetry.timestamp_hour - 12) * 0.05));

  return (
    <group ref={groupRef} position={[-25, 0, -18]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Ground perimeter slab */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[26, 0.1, 18]} />
        <meshStandardMaterial color="#1a2e22" roughness={0.9} />
      </mesh>

      {/* Solar Panel Racks */}
      {Array.from({ length: rows }).map((_, r) => (
        <group key={r} position={[0, 0, (r - rows / 2) * 2.2]}>
          {Array.from({ length: cols }).map((_, c) => {
            const xPos = (c - cols / 2) * 2.2;
            return (
              <group key={c} position={[xPos, 0, 0]}>
                {/* Steel Support Post */}
                <mesh position={[0, 0.4, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
                  <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
                </mesh>

                {/* Photovoltaic Panel Module */}
                <mesh position={[0, 0.8, 0]} rotation={[0.45 + tilt, 0, 0]} castShadow={!performanceMode}>
                  <boxGeometry args={[1.8, 0.04, 1.1]} />
                  <meshStandardMaterial
                    color={isOnline ? "#0f3b5c" : "#1e293b"}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={isOnline ? "#0284c7" : "#000000"}
                    emissiveIntensity={isOnline ? (outputMW / 100) * 0.4 : 0}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}

      {/* Central Inverter Skids */}
      <mesh position={[0, 0.75, 7.5]} castShadow>
        <boxGeometry args={[3.5, 1.5, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 3D Asset Floating Billboard Label */}
      <Html position={[0, 3.2, 0]} center distanceFactor={28} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md border shadow-lg transition-transform group-hover:scale-105 flex items-center gap-1.5 ${
            isOnline
              ? 'bg-slate-900/85 border-amber-400/50 text-amber-300'
              : 'bg-red-950/85 border-red-500/50 text-red-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold">SOLAR PV FARM</span>
            <span className="text-slate-400 font-mono text-[10px]">|</span>
            <span className="font-mono text-cyan-300">{outputMW.toFixed(1)} MW</span>
          </div>
        </div>
      </Html>
    </group>
  );
};
