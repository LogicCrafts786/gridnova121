import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RenewableConfig, SystemTelemetry } from '../../types/api';

interface WindFarm3DProps {
  config: RenewableConfig;
  telemetry: SystemTelemetry;
  performanceMode: boolean;
  onSelect: () => void;
}

const SingleTurbine: React.FC<{
  position: [number, number, number];
  rotationSpeed: number;
  isOnline: boolean;
  performanceMode: boolean;
}> = ({ position, rotationSpeed, isOnline, performanceMode }) => {
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rotorRef.current && isOnline) {
      rotorRef.current.rotation.z += rotationSpeed * delta;
    }
  });

  return (
    <group position={position}>
      {/* Concrete Foundation */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.3, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Tubular Steel Tower */}
      <mesh position={[0, 4.5, 0]} castShadow={!performanceMode}>
        <cylinderGeometry args={[0.22, 0.45, 9, 14]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Nacelle */}
      <mesh position={[0, 9.1, 0.2]} castShadow={!performanceMode}>
        <boxGeometry args={[0.9, 0.8, 2.2]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Red Obstruction Aviation Light on Nacelle */}
      <mesh position={[0, 9.6, -0.6]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Rotor Hub and 3 Blades */}
      <group position={[0, 9.1, 1.25]} ref={rotorRef}>
        {/* Hub Nose Cone */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 0.7, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.2} />
        </mesh>

        {/* 3 Aerodynamic Blades spaced at 120 degrees */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
          <group key={i} rotation={[0, 0, angle]}>
            <mesh position={[0, 2.8, 0]} castShadow={!performanceMode}>
              <boxGeometry args={[0.18, 5.6, 0.05]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.2} />
            </mesh>
            {/* Blade Red Warning Tips */}
            <mesh position={[0, 5.3, 0]}>
              <boxGeometry args={[0.19, 0.7, 0.06]} />
              <meshBasicMaterial color="#dc2626" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

export const WindFarm3D: React.FC<WindFarm3DProps> = ({
  config,
  telemetry,
  performanceMode,
  onSelect
}) => {
  const isOnline = config.is_available && !config.forced_offline && config.current_mw > 0.1;
  // Angular velocity proportional to wind speed (scaled)
  const rotationSpeed = isOnline ? Math.max(0.4, telemetry.wind_speed_m_s * 0.28) : 0;

  const turbinePositions: [number, number, number][] = [
    [-26, 0, 10],
    [-18, 0, 18],
    [-28, 0, 22],
    [-15, 0, 26],
    [-22, 0, 30]
  ];

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Ground Elevation Platform */}
      <mesh position={[-21, -0.05, 21]} receiveShadow>
        <boxGeometry args={[22, 0.1, 26]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {turbinePositions.map((pos, idx) => (
        <SingleTurbine
          key={idx}
          position={pos}
          rotationSpeed={rotationSpeed}
          isOnline={isOnline}
          performanceMode={performanceMode}
        />
      ))}

      {/* Floating HUD Label */}
      <Html position={[-21, 12.5, 21]} center distanceFactor={28} zIndexRange={[100, 0]}>
        <div className="cursor-pointer group select-none pointer-events-auto">
          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md border shadow-lg transition-transform group-hover:scale-105 flex items-center gap-1.5 ${
            isOnline
              ? 'bg-slate-900/85 border-teal-400/50 text-teal-300'
              : 'bg-red-950/85 border-red-500/50 text-red-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-teal-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold">WIND FARM</span>
            <span className="text-slate-400 font-mono text-[10px]">|</span>
            <span className="font-mono text-cyan-300">{config.current_mw.toFixed(1)} MW</span>
            <span className="text-[10px] text-slate-400">({telemetry.wind_speed_m_s.toFixed(1)} m/s)</span>
          </div>
        </div>
      </Html>
    </group>
  );
};
