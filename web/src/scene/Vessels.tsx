import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore, VesselKey } from '../store/useStore';
import {
  VESSEL_CURVES,
  VESSEL_PARAMS,
  getVesselColorThree,
} from './vesselConfig';
import { computeCardiacMotion } from './cardiacMotion';

interface VesselItemProps {
  vesselKey: VesselKey;
  clippingPlane: THREE.Plane | null;
}

const VesselItem: React.FC<VesselItemProps> = ({ vesselKey, clippingPlane }) => {
  const prob = useStore((state) => state.prediction.vessels[vesselKey]?.prob ?? 0.5);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const hoveredVessel = useStore((state) => state.hoveredVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setHoveredVessel = useStore((state) => state.setHoveredVessel);

  const curve = VESSEL_CURVES[vesselKey];
  const params = VESSEL_PARAMS[vesselKey];

  const visibleGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      params.tubularSegments,
      params.radius,
      params.radialSegments,
      false
    );
  }, [curve, params]);

  const proxyGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      Math.floor(params.tubularSegments / 2),
      params.proxyRadius,
      8,
      false
    );
  }, [curve, params]);

  const vesselColor = useMemo(() => {
    return getVesselColorThree(prob, colorblindMode);
  }, [prob, colorblindMode]);

  const isSelected = selectedVessel === vesselKey;
  const isHovered = hoveredVessel === vesselKey;

  return (
    <group name={`Vessel_${vesselKey}`}>
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
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
          clipShadows={true}
        />
      </mesh>

      <mesh
        name={`Proxy_${vesselKey}`}
        geometry={proxyGeometry}
        visible={true}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedVessel(isSelected ? null : vesselKey, true);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredVessel(vesselKey);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHoveredVessel(null);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'auto';
          }
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
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);

  const clippingPlane = useMemo(() => {
    if (!isCutOpen) return null;

    if (dissectionPlane === 'coronal') {
      return new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.52 - cutDepth * 0.92);
    } else if (dissectionPlane === 'short_axis') {
      return new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.45 - cutDepth * 1.05);
    } else {
      return new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.40 - cutDepth * 0.85);
    }
  }, [isCutOpen, dissectionPlane, cutDepth]);

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
  const vesselsGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const { isBeating, heartRateBpm, beatingSpeed } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    if (vesselsGroupRef.current) {
      const radialScale = 1.0 - motion.contraction * 0.088;
      vesselsGroupRef.current.scale.x = radialScale;
      vesselsGroupRef.current.scale.z = radialScale;
      vesselsGroupRef.current.scale.y = 1.0 - motion.shortening * 0.85;
      vesselsGroupRef.current.rotation.y = motion.torsion;
      vesselsGroupRef.current.rotation.z = -motion.contraction * 0.018;
    }
  });

  return (
    <group ref={vesselsGroupRef} name="CoronaryVessels">
      <mesh geometry={lmGeometry} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color="#be123c"
          roughness={0.35}
          metalness={0.10}
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
          clipShadows={true}
        />
      </mesh>

      {vesselKeys.map((key) => (
        <VesselItem key={key} vesselKey={key} clippingPlane={clippingPlane} />
      ))}
    </group>
  );
};
