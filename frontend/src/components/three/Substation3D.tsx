import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GridInterconnectConfig, DispatchCandidate } from '../../types/api';

interface Substation3DProps {
  config: GridInterconnectConfig;
  schedule: DispatchCandidate;
  performanceMode: boolean;
  onSelect: () => void;
}

export const Substation3D: React.FC<Substation3DProps> = ({
  config,
  schedule,
  performanceMode,
  onSelect
}) => {
  const isOnline = config.is_available && !config.forced_offline;
  const isImporting = isOnline && schedule.grid_import_mw > 0.5;
  const isExporting = isOnline && schedule.grid_export_mw > 0.5;

  return (
    <group position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Substation Gravel Yard Ground Pad */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[18, 0.1, 14]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Security Perimeter Fence Posts */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[17.8, 1.2, 13.8]} />
        <meshBasicMaterial color="#64748b" wireframe />
      </mesh>

      {/* Step-up / Step-down Autotransformer Banks */}
      {[-4, 0, 4].map((x, i) => (
        <group key={i} position={[x, 0, -2]}>
          {/* Main Tank */}
          <mesh position={[0, 1.4, 0]} castShadow={!performanceMode}>
            <boxGeometry args={[2.4, 2.8, 2.0]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Radiator Cooling Fins */}
          <mesh position={[1.35, 1.4, 0]}>
            <boxGeometry args={[0.3, 2.2, 1.8]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-1.35, 1.4, 0]}>
            <boxGeometry args={[0.3, 2.2, 1.8]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Oil Conservator Drum */}
          <mesh position={[0, 3.0, -0.3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.4, 0.4, 1.8, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Porcelain High-Voltage Bushings */}
          {[-0.6, 0, 0.6].map((bx, j) => (
            <mesh key={j} position={[bx, 3.4, 0.4]}>
              <cylinderGeometry args={[0.08, 0.15, 1.1, 8]} />
              <meshStandardMaterial color="#e0e7ff" roughness={0.1} />
            </mesh>
          ))}
        </group>
      ))}

      {/* High-Voltage Busbars and Lattice Gantry Tower */}
      <group position={[0, 0, 3]}>
        {/* Steel Lattice Portal Columns */}
        <mesh position={[-6, 3.5, 0]}>
          <boxGeometry args={[0.4, 7.0, 0.4]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[6, 3.5, 0]}>
          <boxGeometry args={[0.4, 7.0, 0.4]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Overhead Crossbeam */}
        <mesh position={[0, 6.8, 0]}>
          <boxGeometry args={[12.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Busbar Conductors */}
        {[-3, -1, 1, 3].map((bx, k) => (
          <group key={k} position={[bx, 6.4, 0]}>
            {/* Hanging Insulator String */}
            <mesh position={[0, -0.4, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
              <meshStandardMaterial color="#c7d2fe" />
            </mesh>
            {/* Line clamp */}
            <mesh position={[0, -0.85, 0]}>
              <sphereGeometry args={[0.12, 6, 6]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        ))}
      </group>

      {/* External Transmission Line Pylon (Grid Connection Point) */}
      <group position={[0, 0, 14]}>
        {/* High Voltage Steel Transmission Pylon */}
        <mesh position={[0, 6.0, 0]} castShadow={!performanceMode}>
          <cylinderGeometry args={[0.3, 1.2, 12, 4]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} wireframe={performanceMode} />
        </mesh>
        {/* Top Crossarms */}
        <mesh position={[0, 10.5, 0]}>
          <boxGeometry args={[7.0, 0.3, 0.4]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[9.0, 0.3, 0.4]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Floating Substation HUD Label */}
      <Html position={[0, 8.5, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-2.5 py-1.5 rounded-md text-xs font-semibold backdrop-blur-md border shadow-xl transition-transform group-hover:scale-105 flex flex-col gap-0.5 ${
            !isOnline
              ? 'bg-red-950/85 border-red-500/50 text-red-300'
              : isImporting
              ? 'bg-violet-950/85 border-violet-400/50 text-violet-300'
              : isExporting
              ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-300'
              : 'bg-slate-900/85 border-slate-600 text-slate-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                !isOnline
                  ? 'bg-red-500'
                  : isImporting || isExporting
                  ? 'bg-violet-400 animate-pulse'
                  : 'bg-emerald-400'
              }`} />
              <span className="font-bold">CENTRAL SUBSTATION</span>
              <span className="text-slate-400 font-mono text-[10px]">|</span>
              <span className="font-mono text-cyan-300">
                {isImporting
                  ? `Importing +${schedule.grid_import_mw.toFixed(1)} MW`
                  : isExporting
                  ? `Exporting -${schedule.grid_export_mw.toFixed(1)} MW`
                  : 'Balanced (0.0 MW)'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between gap-2">
              <span>Grid Tie: {isOnline ? 'ENERGIZED' : 'SEVERED'}</span>
              <span>Limits: +{config.max_import_mw.toFixed(0)} / -{config.max_export_mw.toFixed(0)} MW</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};
