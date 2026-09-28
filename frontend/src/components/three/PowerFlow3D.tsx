import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DispatchCandidate } from '../../types/api';

interface PowerFlow3DProps {
  schedule: DispatchCandidate;
  performanceMode: boolean;
}

interface ConduitProps {
  start: [number, number, number];
  end: [number, number, number];
  mid?: [number, number, number];
  activeMW: number;
  color: string;
  reverse?: boolean;
  performanceMode: boolean;
}

const FlowConduit: React.FC<ConduitProps> = ({
  start,
  end,
  mid,
  activeMW,
  color,
  reverse = false,
  performanceMode
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const curve = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    const vMid = mid
      ? new THREE.Vector3(...mid)
      : new THREE.Vector3(
          (vStart.x + vEnd.x) / 2,
          Math.max(vStart.y, vEnd.y) + 2.0,
          (vStart.z + vEnd.z) / 2
        );
    return new THREE.CatmullRomCurve3([vStart, vMid, vEnd]);
  }, [start, end, mid]);

  // Static line geometry for the cable
  const lineGeometry = useMemo(() => {
    const pts = curve.getPoints(24);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [curve]);

  // Particle counts scale with MW and performance mode
  const particleCount = useMemo(() => {
    if (activeMW <= 0.1) return 0;
    const base = performanceMode ? 10 : 22;
    return Math.min(40, Math.max(6, Math.floor(base * (activeMW / 40))));
  }, [activeMW, performanceMode]);

  // Track progress of each particle [0, 1] along curve
  const offsets = useMemo(() => {
    const arr = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      arr[i] = i / particleCount;
    }
    return arr;
  }, [particleCount]);

  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current || particleCount === 0) return;

    // Speed proportional to MW flow
    const speed = (0.25 + Math.min(0.6, (activeMW / 100) * 0.45)) * delta;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      if (reverse) {
        offsets[i] -= speed;
        if (offsets[i] < 0) offsets[i] += 1.0;
      } else {
        offsets[i] += speed;
        if (offsets[i] > 1.0) offsets[i] -= 1.0;
      }

      const u = Math.max(0, Math.min(1, offsets[i]));
      const pt = curve.getPointAt(u);
      if (pt) {
        posArr[i * 3] = pt.x;
        posArr[i * 3 + 1] = pt.y;
        posArr[i * 3 + 2] = pt.z;
      }
    }
    posAttr.needsUpdate = true;
  });

  const lineObject = useMemo(() => {
    const isOffline = activeMW <= 0.1;
    const mat = new THREE.LineBasicMaterial({
      color: isOffline ? "#1e293b" : color,
      transparent: true,
      opacity: isOffline ? 0.3 : 0.45
    });
    return new THREE.Line(lineGeometry, mat);
  }, [lineGeometry, color, activeMW <= 0.1]);

  if (activeMW <= 0.1) {
    // Show dormant faint cable when offline
    return <primitive object={lineObject} />;
  }

  return (
    <group>
      {/* Semi-transparent glowing cable path */}
      <primitive object={lineObject} />

      {/* Moving Energy Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={performanceMode ? 0.45 : 0.65}
          color={color}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export const PowerFlow3D: React.FC<PowerFlow3DProps> = ({
  schedule,
  performanceMode
}) => {
  const totalGenThermal = schedule.g1_mw + schedule.g2_mw + schedule.g3_mw;

  return (
    <group>
      {/* 1. Solar PV Farm -> Central Substation */}
      <FlowConduit
        start={[-25, 1.2, -18]}
        mid={[-12, 3.5, -9]}
        end={[0, 2.2, 0]}
        activeMW={schedule.solar_mw}
        color="#10b981" // Emerald Green
        performanceMode={performanceMode}
      />

      {/* 2. Wind Farm -> Central Substation */}
      <FlowConduit
        start={[-21, 2.0, 21]}
        mid={[-10, 3.8, 10]}
        end={[0, 2.2, 0]}
        activeMW={schedule.wind_mw}
        color="#06b6d4" // Cyan
        performanceMode={performanceMode}
      />

      {/* 3. Thermal Generators (G1+G2+G3) -> Central Substation */}
      <FlowConduit
        start={[22, 1.5, -18]}
        mid={[11, 3.2, -9]}
        end={[0, 2.2, 0]}
        activeMW={totalGenThermal}
        color="#f59e0b" // Amber
        performanceMode={performanceMode}
      />

      {/* 4. Battery Storage <-> Central Substation */}
      {schedule.battery_discharge_mw > 0.1 ? (
        <FlowConduit
          start={[-6, 1.5, -22]}
          mid={[-3, 3.0, -11]}
          end={[0, 2.2, 0]}
          activeMW={schedule.battery_discharge_mw}
          color="#10b981" // Discharging -> into grid
          reverse={false}
          performanceMode={performanceMode}
        />
      ) : schedule.battery_charge_mw > 0.1 ? (
        <FlowConduit
          start={[-6, 1.5, -22]}
          mid={[-3, 3.0, -11]}
          end={[0, 2.2, 0]}
          activeMW={schedule.battery_charge_mw}
          color="#38bdf8" // Charging -> from grid into battery
          reverse={true}
          performanceMode={performanceMode}
        />
      ) : null}

      {/* 5. Regional Grid Interconnect <-> Substation */}
      {schedule.grid_import_mw > 0.1 ? (
        <FlowConduit
          start={[0, 6.0, 14]}
          mid={[0, 4.5, 7]}
          end={[0, 2.2, 0]}
          activeMW={schedule.grid_import_mw}
          color="#a855f7" // Purple Import
          reverse={false}
          performanceMode={performanceMode}
        />
      ) : schedule.grid_export_mw > 0.1 ? (
        <FlowConduit
          start={[0, 6.0, 14]}
          mid={[0, 4.5, 7]}
          end={[0, 2.2, 0]}
          activeMW={schedule.grid_export_mw}
          color="#22c55e" // Export
          reverse={true}
          performanceMode={performanceMode}
        />
      ) : null}

      {/* 6. Central Substation -> Metropolitan City Load */}
      <FlowConduit
        start={[0, 2.2, 0]}
        mid={[12, 3.8, 9]}
        end={[24, 2.0, 18]}
        activeMW={
          schedule.solar_mw +
          schedule.wind_mw +
          totalGenThermal +
          schedule.grid_import_mw +
          schedule.battery_discharge_mw -
          schedule.battery_charge_mw -
          schedule.grid_export_mw -
          schedule.curtailment_mw
        }
        color="#eab308" // Gold Yellow Load Flow
        performanceMode={performanceMode}
      />
    </group>
  );
};
