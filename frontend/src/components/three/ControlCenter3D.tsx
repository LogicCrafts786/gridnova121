import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface ControlCenter3DProps {
  activeStage: string;
  isEmergency: boolean;
  performanceMode: boolean;
  onSelect: () => void;
}

export const ControlCenter3D: React.FC<ControlCenter3DProps> = ({
  activeStage,
  isEmergency,
  performanceMode,
  onSelect
}) => {
  const beaconRef = useRef<THREE.Group>(null);
  const radarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (radarRef.current) {
      radarRef.current.rotation.y = t * 1.5;
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = 5.2 + Math.sin(t * 3) * 0.15;
    }
  });

  return (
    <group position={[0, 0, -6]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Octagonal Foundation Base */}
      <mesh position={[0, 0.2, 0]} castShadow={!performanceMode}>
        <cylinderGeometry args={[5.2, 5.8, 0.4, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main Control Center Tier 1 */}
      <mesh position={[0, 1.6, 0]} castShadow={!performanceMode}>
        <cylinderGeometry args={[4.4, 5.0, 2.4, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Glass Observation Deck Band */}
      <mesh position={[0, 2.3, 0]}>
        <cylinderGeometry args={[4.45, 4.45, 0.7, 16]} />
        <meshBasicMaterial
          color={isEmergency ? "#ef4444" : "#06b6d4"}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Tier 2 Command Dome */}
      <mesh position={[0, 3.4, 0]} castShadow={!performanceMode}>
        <cylinderGeometry args={[3.2, 3.8, 1.2, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rooftop Quantum Antenna Mast */}
      <mesh position={[0, 4.4, 0]}>
        <cylinderGeometry args={[0.08, 0.15, 1.6, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rotating Satellite Radar Dish */}
      <mesh ref={radarRef} position={[1.4, 4.2, 1.4]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.7, 0.3, 12, 1, true]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Pulsating Holographic Quantum Beacon Rings */}
      <group ref={beaconRef} position={[0, 5.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.4, 32]} />
          <meshBasicMaterial
            color={isEmergency ? "#ef4444" : "#a855f7"}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial color={isEmergency ? "#f87171" : "#c084fc"} />
        </mesh>
      </group>

      {/* Floating Control Center Billboard Label */}
      <Html position={[0, 7.2, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border shadow-2xl transition-transform group-hover:scale-105 flex flex-col items-center gap-0.5 ${
            isEmergency
              ? 'bg-red-950/90 border-red-500 text-red-200 glow-red'
              : 'bg-slate-950/90 border-purple-500/60 text-purple-200 glow-cyan'
          }`}>
            <div className="flex items-center gap-1.5 font-bold tracking-wide">
              <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-red-500 animate-ping' : 'bg-purple-400 animate-pulse'}`} />
              <span>AI + HYBRID QUANTUM ENERGY CONTROL CENTER</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span className="font-mono text-cyan-300">SYSTEM BRAIN</span>
              <span>•</span>
              <span className="text-slate-300">{activeStage}</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};
