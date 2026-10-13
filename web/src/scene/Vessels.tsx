import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore, VesselKey } from '../store/useStore';
import {
  VESSEL_CURVES,
  VESSEL_PARAMS,
  getVesselColorThree,
} from './vesselConfig';

interface VesselItemProps {
  vesselKey: VesselKey;
}

const VesselItem: React.FC<VesselItemProps> = ({ vesselKey }) => {
  const prob = useStore((state) => state.prediction.vessels[vesselKey]?.prob ?? 0.5);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const hoveredVessel = useStore((state) => state.hoveredVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setHoveredVessel = useStore((state) => state.setHoveredVessel);

  const curve = VESSEL_CURVES[vesselKey];
  const params = VESSEL_PARAMS[vesselKey];

  // Procedural visible tube geometry
  const visibleGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      params.tubularSegments,
      params.radius,
      params.radialSegments,
      false
    );
  }, [curve, params]);

  // Invisible 2.5x radius proxy tube geometry for hit testing
  const proxyGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      Math.floor(params.tubularSegments / 2),
      params.proxyRadius,
      8,
      false
    );
  }, [curve, params]);

  // Uniform color per vessel strictly respecting clinical guardrails
  const vesselColor = useMemo(() => {
    return getVesselColorThree(prob, colorblindMode);
  }, [prob, colorblindMode]);

  const isSelected = selectedVessel === vesselKey;
  const isHovered = hoveredVessel === vesselKey;

  return (
    <group name={`Vessel_${vesselKey}`}>
      {/* Primary visible vessel tube */}
      <mesh
        geometry={visibleGeometry}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color={vesselColor}
          roughness={0.32}
          metalness={0.12}
          emissive={isSelected ? vesselColor : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.15 : 0.0}
        />
      </mesh>

      {/* Invisible enlarged proxy tube for easy pointer interaction */}
      <mesh
        geometry={proxyGeometry}
        visible={true}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedVessel(isSelected ? null : vesselKey);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredVessel(vesselKey);
        }}
        onPointerOut={() => {
          setHoveredVessel(null);
        }}
      >
        <meshBasicMaterial
          transparent={true}
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export const Vessels: React.FC = () => {
  // Left Main trunk (inflow feeder from aortic root to LAD/LCX bifurcation)
  const lmCurve = VESSEL_CURVES.LM;
  const lmParams = VESSEL_PARAMS.LM;

  const lmGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      lmCurve,
      lmParams.tubularSegments,
      lmParams.radius,
      lmParams.radialSegments,
      false
    );
  }, [lmCurve, lmParams]);

  const vesselKeys: VesselKey[] = ['LAD', 'LCX', 'RCA'];

  return (
    <group name="CoronaryVessels">
      {/* Left Main (LM) feeder trunk */}
      <mesh geometry={lmGeometry} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color="#be123c" // Arterial crimson root
          roughness={0.35}
          metalness={0.10}
        />
      </mesh>

      {/* Primary diagnostic target vessels: LAD, LCX, RCA */}
      {vesselKeys.map((key) => (
        <VesselItem key={key} vesselKey={key} />
      ))}
    </group>
  );
};
