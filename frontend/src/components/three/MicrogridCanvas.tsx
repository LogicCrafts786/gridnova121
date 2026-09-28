import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SystemStateResponse, GeneratorConfig } from '../../types/api';
import { SolarFarm3D } from './SolarFarm3D';
import { WindFarm3D } from './WindFarm3D';
import { BatteryFacility3D } from './BatteryFacility3D';
import { ThermalPlants3D } from './ThermalPlants3D';
import { Substation3D } from './Substation3D';
import { CityLoad3D } from './CityLoad3D';
import { ControlCenter3D } from './ControlCenter3D';
import { PowerFlow3D } from './PowerFlow3D';

export type CameraPreset =
  | 'overview'
  | 'solar'
  | 'wind'
  | 'battery'
  | 'thermal'
  | 'substation'
  | 'city'
  | 'control_center';

interface MicrogridCanvasProps {
  systemState: SystemStateResponse;
  cameraPreset: CameraPreset;
  performanceMode: boolean;
  onSelectAsset: (assetType: string, assetData?: any) => void;
}

const CameraController: React.FC<{ preset: CameraPreset }> = ({ preset }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    let targetPos = new THREE.Vector3(0, 42, 58);
    let lookTarget = new THREE.Vector3(0, 0, 0);

    switch (preset) {
      case 'overview':
        targetPos = new THREE.Vector3(0, 48, 62);
        lookTarget = new THREE.Vector3(0, 0, 0);
        break;
      case 'solar':
        targetPos = new THREE.Vector3(-25, 12, -2);
        lookTarget = new THREE.Vector3(-25, 1, -18);
        break;
      case 'wind':
        targetPos = new THREE.Vector3(-21, 18, 38);
        lookTarget = new THREE.Vector3(-21, 8, 21);
        break;
      case 'battery':
        targetPos = new THREE.Vector3(-6, 11, -8);
        lookTarget = new THREE.Vector3(-6, 1.5, -22);
        break;
      case 'thermal':
        targetPos = new THREE.Vector3(22, 14, -2);
        lookTarget = new THREE.Vector3(22, 2.5, -18);
        break;
      case 'substation':
        targetPos = new THREE.Vector3(0, 15, 18);
        lookTarget = new THREE.Vector3(0, 2, 0);
        break;
      case 'city':
        targetPos = new THREE.Vector3(24, 25, 38);
        lookTarget = new THREE.Vector3(24, 5, 18);
        break;
      case 'control_center':
        targetPos = new THREE.Vector3(0, 11, 8);
        lookTarget = new THREE.Vector3(0, 3, -6);
        break;
    }

    camera.position.lerp(targetPos, 0.95);
    camera.lookAt(lookTarget);
  }, [preset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera clipping below ground
      minDistance={10}
      maxDistance={120}
    />
  );
};

export const MicrogridCanvas: React.FC<MicrogridCanvasProps> = ({
  systemState,
  cameraPreset,
  performanceMode,
  onSelectAsset
}) => {
  const { telemetry, renewables, battery_state, generators, grid_interconnect, final_schedule, active_pipeline_stage, is_emergency } = systemState;

  // Day / Night lighting interpolation based on simulation hour
  const hour = telemetry.timestamp_hour;
  const isDay = hour >= 6 && hour <= 18;
  const sunElevation = Math.max(0.05, Math.sin(((hour - 6) / 12) * Math.PI));
  const sunX = Math.cos(((hour - 6) / 12) * Math.PI) * 40;
  const sunY = sunElevation * 45;
  const sunIntensity = isDay ? sunElevation * 1.5 + 0.3 : 0.08;
  const ambientIntensity = isDay ? 0.45 : 0.15;

  const solarConfig = renewables.find(r => r.id === "SOLAR-1") || renewables[0];
  const windConfig = renewables.find(r => r.id === "WIND-1") || renewables[1];

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: [0, 48, 62], fov: 45 }}
        shadows={!performanceMode}
        gl={{ antialias: !performanceMode, powerPreference: 'high-performance' }}
      >
        <CameraController preset={cameraPreset} />

        {/* Ambient & Sun / Moon Directional Light */}
        <ambientLight intensity={ambientIntensity} color={isDay ? "#f8fafc" : "#1e293b"} />
        <directionalLight
          position={[sunX, sunY, -25]}
          intensity={sunIntensity}
          color={isDay ? (hour > 16 || hour < 8 ? "#fdba74" : "#fef08a") : "#38bdf8"}
          castShadow={!performanceMode && isDay}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />

        {/* Night Accent Sky Fill Light */}
        {!isDay && (
          <directionalLight position={[0, 30, 20]} intensity={0.2} color="#6366f1" />
        )}

        {/* Microgrid Terrain Ground Plane */}
        <mesh position={[0, -0.1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[110, 110]} />
          <meshStandardMaterial color="#090d16" roughness={0.95} metalness={0.1} />
        </mesh>

        {/* High-tech Ground Grid Mesh */}
        <Grid
          position={[0, -0.08, 0]}
          args={[100, 100]}
          cellSize={2.5}
          cellThickness={0.8}
          cellColor="#1e293b"
          sectionSize={10}
          sectionThickness={1.5}
          sectionColor="#334155"
          fadeDistance={80}
          fadeStrength={1.5}
        />

        {/* 1. Solar Farm Asset */}
        <SolarFarm3D
          config={solarConfig}
          telemetry={telemetry}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('solar', solarConfig)}
        />

        {/* 2. Wind Farm Asset */}
        <WindFarm3D
          config={windConfig}
          telemetry={telemetry}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('wind', windConfig)}
        />

        {/* 3. Battery Storage Facility Asset */}
        <BatteryFacility3D
          config={battery_state}
          schedule={final_schedule}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('battery', battery_state)}
        />

        {/* 4. Conventional Thermal Generators G1, G2, G3 */}
        <ThermalPlants3D
          generators={generators}
          schedule={final_schedule}
          performanceMode={performanceMode}
          onSelectGenerator={(g: GeneratorConfig) => onSelectAsset('generator', g)}
        />

        {/* 5. Central High-Voltage Substation & Grid Pylon */}
        <Substation3D
          config={grid_interconnect}
          schedule={final_schedule}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('substation', grid_interconnect)}
        />

        {/* 6. Metropolitan City Load Center */}
        <CityLoad3D
          telemetry={telemetry}
          forecast={systemState.forecast}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('load', { demand: telemetry.base_demand_mw })}
        />

        {/* 7. Central Operations Building */}
        <ControlCenter3D
          activeStage={active_pipeline_stage}
          isEmergency={is_emergency}
          performanceMode={performanceMode}
          onSelect={() => onSelectAsset('control_center')}
        />

        {/* 8. Visual Power Flow Streams */}
        <PowerFlow3D
          schedule={final_schedule}
          performanceMode={performanceMode}
        />
      </Canvas>
    </div>
  );
};
