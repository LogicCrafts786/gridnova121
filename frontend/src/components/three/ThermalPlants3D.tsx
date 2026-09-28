import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratorConfig, DispatchCandidate } from '../../types/api';

interface ThermalPlants3DProps {
  generators: GeneratorConfig[];
  schedule: DispatchCandidate;
  performanceMode: boolean;
  onSelectGenerator: (g: GeneratorConfig) => void;
}

const SinglePlant: React.FC<{
  gen: GeneratorConfig;
  committed: boolean;
  dispatchedMW: number;
  position: [number, number, number];
  size: [number, number, number];
  stackHeight: number;
  performanceMode: boolean;
  onSelect: () => void;
}> = ({ gen, committed, dispatchedMW, position, size, stackHeight, performanceMode, onSelect }) => {
  const smokeRef = useRef<THREE.Points>(null);
  const isRunning = committed && dispatchedMW > 0.1 && gen.is_available && !gen.forced_offline;
  const isTripped = !gen.is_available || gen.forced_offline;

  // Animate exhaust smoke/heat plume when running
  useFrame((state) => {
    if (smokeRef.current && isRunning) {
      const positions = smokeRef.current.geometry.attributes.position.array as Float32Array;
      const t = state.clock.getElapsedTime();
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.04; // Rise up
        if (positions[i + 1] > stackHeight + 4.5) {
          positions[i + 1] = stackHeight;
          positions[i] = (Math.random() - 0.5) * 0.4;
          positions[i + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      smokeRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  // Smoke particle geometry
  const particleCount = performanceMode ? 12 : 25;
  const smokePositions = React.useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = stackHeight + Math.random() * 4.0;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return arr;
  }, [particleCount, stackHeight]);

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Turbine Hall Building */}
      <mesh position={[0, size[1] / 2, 0]} castShadow={!performanceMode}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={isTripped ? "#450a0a" : isRunning ? "#334155" : "#1e293b"}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Industrial Roof Skylights */}
      <mesh position={[0, size[1] + 0.15, 0]}>
        <boxGeometry args={[size[0] * 0.8, 0.3, size[2] * 0.6]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical Exhaust Stack */}
      <group position={[size[0] * 0.35, 0, 0]}>
        <mesh position={[0, stackHeight / 2, 0]} castShadow={!performanceMode}>
          <cylinderGeometry args={[0.3, 0.45, stackHeight, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Top Warning Stripes */}
        <mesh position={[0, stackHeight - 0.4, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.8, 14]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>

        {/* Dynamic Exhaust Smoke / Heat Plume */}
        {isRunning && (
          <points ref={smokeRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[smokePositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={performanceMode ? 0.4 : 0.6}
              color="#94a3b8"
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </points>
        )}
      </group>

      {/* Heavy Duty Step-up Transformer Unit */}
      <mesh position={[-size[0] * 0.35, 1.0, 0]} castShadow>
        <boxGeometry args={[1.6, 2.0, 1.6]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Floating Asset HUD Label */}
      <Html position={[0, size[1] + 2.8, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md border shadow-lg transition-transform group-hover:scale-105 flex items-center gap-1.5 ${
            isTripped
              ? 'bg-red-950/85 border-red-500/50 text-red-300'
              : isRunning
              ? 'bg-amber-950/85 border-amber-400/50 text-amber-300'
              : 'bg-slate-900/85 border-slate-600 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isTripped
                ? 'bg-red-500'
                : isRunning
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-500'
            }`} />
            <span className="font-bold">{gen.id}</span>
            <span className="text-slate-400 font-mono text-[10px]">|</span>
            <span className="font-mono text-slate-100">
              {isRunning ? `${dispatchedMW.toFixed(1)} MW` : isTripped ? 'TRIPPED' : 'OFF'}
            </span>
            <span className="text-[10px] text-slate-400">/{gen.max_mw.toFixed(0)} MW</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

export const ThermalPlants3D: React.FC<ThermalPlants3DProps> = ({
  generators,
  schedule,
  performanceMode,
  onSelectGenerator
}) => {
  const g1 = generators.find(g => g.id === "G1") || generators[0];
  const g2 = generators.find(g => g.id === "G2") || generators[1];
  const g3 = generators.find(g => g.id === "G3") || generators[2];

  return (
    <group position={[22, 0, -18]}>
      {/* Heavy Concrete Complex Base */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[24, 0.1, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* G1 Base-Load Combined Cycle */}
      <SinglePlant
        gen={g1}
        committed={schedule.g1_committed}
        dispatchedMW={schedule.g1_mw}
        position={[-7, 0, 0]}
        size={[5.5, 4.0, 7.5]}
        stackHeight={8.0}
        performanceMode={performanceMode}
        onSelect={() => onSelectGenerator(g1)}
      />

      {/* G2 Intermediate Gas */}
      <SinglePlant
        gen={g2}
        committed={schedule.g2_committed}
        dispatchedMW={schedule.g2_mw}
        position={[0, 0, 0]}
        size={[4.5, 3.4, 6.5]}
        stackHeight={6.5}
        performanceMode={performanceMode}
        onSelect={() => onSelectGenerator(g2)}
      />

      {/* G3 Fast-Start Peaker */}
      <SinglePlant
        gen={g3}
        committed={schedule.g3_committed}
        dispatchedMW={schedule.g3_mw}
        position={[6.5, 0, 0]}
        size={[3.8, 2.8, 5.5]}
        stackHeight={5.2}
        performanceMode={performanceMode}
        onSelect={() => onSelectGenerator(g3)}
      />
    </group>
  );
};
