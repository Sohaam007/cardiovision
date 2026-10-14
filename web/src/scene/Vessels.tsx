import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore, VesselKey } from '../store/useStore';
import {
  VESSEL_CURVES,
  VESSEL_PARAMS,
  getVesselColorThree,
  getVesselColorHex,
} from './vesselConfig';
import { computeCardiacMotion } from './cardiacMotion';

/**
 * Animated Hemodynamic Blood Flow Pulse Stream (Active when showHemodynamics = true)
 * Flow velocity surges physiologically in diastole, matching human coronary perfusion.
 */
interface FlowStreamProps {
  curve: THREE.Curve<THREE.Vector3>;
  prob: number;
  clippingPlane: THREE.Plane | null;
}

const FlowStream: React.FC<FlowStreamProps> = ({ curve, prob, clippingPlane }) => {
  const showHemodynamics = useStore((state) => state.showHemodynamics);
  const isPlaying = useStore((state) => state.isPlaying);
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

  const count = 10;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const offsetRef = useRef(0);

  useFrame((state, delta) => {
    if (!showHemodynamics || !instancedRef.current || !isPlaying) return;

    const { heartRateBpm, beatingSpeed, isBeating } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    // Diastolic flow surge (coronary flow occurs primarily in diastole)
    const coronaryFlowMultiplier = motion.phase >= 0.35 ? 2.5 : 0.8;
    offsetRef.current = (offsetRef.current + delta * 0.32 * coronaryFlowMultiplier * (1.1 - prob * 0.45)) % 1.0;

    for (let i = 0; i < count; i++) {
      const t = (offsetRef.current + i / count) % 1.0;
      const pt = curve.getPoint(t);
      dummy.position.copy(pt);
      dummy.scale.setScalar(0.015 + Math.sin(t * Math.PI) * 0.007);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!showHemodynamics) return null;

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={fluoroscopyMode ? '#020617' : '#38bdf8'}
        transparent
        opacity={0.88}
        clippingPlanes={clippingPlane ? [clippingPlane] : []}
      />
    </instancedMesh>
  );
};

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
  const showCalibers = useStore((state) => state.showCalibers);
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

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

  const vesselColorThree = useMemo(() => {
    return getVesselColorThree(prob, colorblindMode);
  }, [prob, colorblindMode]);

  const vesselColorHex = useMemo(() => {
    return getVesselColorHex(prob, colorblindMode);
  }, [prob, colorblindMode]);

  const isSelected = selectedVessel === vesselKey;
  const isHovered = hoveredVessel === vesselKey;

  // Caliber tag position at ~38% of vessel trajectory
  const tagPosition = useMemo(() => {
    const pt = curve.getPoint(0.38);
    // Push slightly outward along normal for clean visibility
    return [pt.x * 1.08, pt.y, pt.z * 1.08] as [number, number, number];
  }, [curve]);

  const caliberEstimate = vesselKey === 'LAD' ? '3.5 mm' : vesselKey === 'LCX' ? '3.0 mm' : '3.8 mm';

  return (
    <group name={`Vessel_${vesselKey}`}>
      <mesh
        geometry={visibleGeometry}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color={fluoroscopyMode ? '#020617' : vesselColorThree}
          roughness={fluoroscopyMode ? 0.15 : 0.32}
          metalness={fluoroscopyMode ? 0.85 : 0.12}
          emissive={fluoroscopyMode ? '#000000' : isSelected ? vesselColorThree : '#000000'}
          emissiveIntensity={isSelected ? 0.38 : isHovered ? 0.16 : 0.0}
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
          clipShadows={true}
        />
      </mesh>

      {/* Hemodynamic Blood Flow Pulse Stream (Active when showHemodynamics = true) */}
      <FlowStream curve={curve} prob={prob} clippingPlane={clippingPlane} />

      {/* Interactive 3D Caliber / Stenosis Probability Chip (Active when showCalibers = true) */}
      {showCalibers && (
        <Html position={tagPosition} center distanceFactor={6.2}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVessel(isSelected ? null : vesselKey, true);
            }}
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold shadow-2xl cursor-pointer whitespace-nowrap transition-all flex items-center gap-1.5 select-none ${
              isSelected
                ? 'bg-cyan-950 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/80 scale-105'
                : 'bg-[#090d16]/95 text-slate-200 border-slate-700/80 hover:border-cyan-500 hover:scale-105'
            }`}
            title={`Select ${vesselKey} territory: ${((prob * 100)).toFixed(0)}% risk, lumen ${caliberEstimate}`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: vesselColorHex }}
            />
            <span>{vesselKey}</span>
            <span className="font-mono text-cyan-300">{((prob * 100)).toFixed(0)}%</span>
            <span className="text-[9px] font-mono text-slate-400 font-normal">({caliberEstimate})</span>
          </button>
        </Html>
      )}

      {/* Invisible Expanded Proxy Tube for effortless touch/click selection */}
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
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

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
      {/* Left Main (LM) Trunk */}
      <mesh geometry={lmGeometry} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color={fluoroscopyMode ? '#020617' : '#be123c'}
          roughness={fluoroscopyMode ? 0.15 : 0.35}
          metalness={fluoroscopyMode ? 0.85 : 0.10}
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
          clipShadows={true}
        />
      </mesh>

      {/* Left Main Flow */}
      <FlowStream curve={lmCurve} prob={0.2} clippingPlane={clippingPlane} />

      {/* Target Vessels: LAD, LCX, RCA with uniform whole-vessel risk coloring */}
      {vesselKeys.map((key) => (
        <VesselItem key={key} vesselKey={key} clippingPlane={clippingPlane} />
      ))}
    </group>
  );
};
