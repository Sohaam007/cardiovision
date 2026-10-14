import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore';

/**
 * Procedural stylized myocardium geometry fallback
 * Conical apex tapering, LV bulge, posterior diaphragmatic flattening,
 * optional anterior chamber dissection window, and AV sulcal adipose pads.
 */
interface ProceduralHeartProps {
  heartOpacity: number;
  chamberCutaway: boolean;
}

const ProceduralHeart: React.FC<ProceduralHeartProps> = ({ heartOpacity, chamberCutaway }) => {
  // 1. Procedural myocardium geometry with anatomical deformation
  const myocardiumGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 48, 36);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = Math.max(0, Math.min(1, (v.y + 1.0) / 2.0));
      const taper = 0.32 + 0.68 * Math.sqrt(t);
      v.x *= taper;
      v.z *= taper;

      if (v.x > 0) v.x *= 1.14;
      if (v.z < 0) v.z *= 0.84;

      if (v.z > 0 && v.x > 0.12 && v.x < 0.42) {
        const distFromGrooveCenter = Math.abs(v.x - 0.28) / 0.15;
        const indent = Math.max(0, 1.0 - distFromGrooveCenter) * 0.055;
        v.z -= indent;
      }

      v.y *= 1.15;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Cutaway Myocardium Geometry (Anterior Ventricular Dissection Window)
  const cutawayMyocardiumGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 48, 36);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = Math.max(0, Math.min(1, (v.y + 1.0) / 2.0));
      const taper = 0.32 + 0.68 * Math.sqrt(t);
      v.x *= taper;
      v.z *= taper;

      if (v.x > 0) v.x *= 1.14;
      if (v.z < 0) v.z *= 0.84;

      if (v.z > 0.08 && v.y > -0.92 && v.y < 0.58) {
        const wallDist = Math.sqrt(v.x * v.x + (v.y + 0.15) * (v.y + 0.15));
        if (wallDist < 0.72) {
          v.z = -0.15 + 0.20 * Math.sin(v.y * 3.0);
        }
      }

      v.y *= 1.15;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Great vessels and chambers
  const atriaGeo = useMemo(() => new THREE.SphereGeometry(1.0, 24, 20), []);
  const aortaGeo = useMemo(() => new THREE.CylinderGeometry(0.20, 0.22, 0.75, 24), []);
  const pulmonaryGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.18, 0.65, 20), []);
  const svcGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.13, 0.55, 16), []);
  const branchGeo = useMemo(() => new THREE.CylinderGeometry(0.055, 0.065, 0.32, 12), []);
  const adiposeTorusGeo = useMemo(() => new THREE.TorusGeometry(0.68, 0.085, 12, 28, Math.PI * 1.6), []);

  // Internal chamber cutaway geometry
  const septumGeo = useMemo(() => new THREE.BoxGeometry(0.14, 0.95, 0.65), []);
  const valveRingGeo = useMemo(() => new THREE.TorusGeometry(0.18, 0.024, 10, 24), []);
  const chordaeGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), []);
  const papillaryGeo = useMemo(() => new THREE.ConeGeometry(0.08, 0.28, 8), []);

  const isTranslucent = heartOpacity < 0.98;

  return (
    <group name="ProceduralHeartMesh">
      <mesh
        geometry={chamberCutaway ? cutawayMyocardiumGeo : myocardiumGeo}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#881337"
          roughness={0.52}
          metalness={0.08}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
          side={chamberCutaway ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      <mesh
        geometry={adiposeTorusGeo}
        position={[0.02, 0.52, 0.05]}
        rotation={[Math.PI / 2.2, -0.15, 0.3]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#ca8a04"
          roughness={0.62}
          metalness={0.04}
          transparent={isTranslucent}
          opacity={heartOpacity * 0.95}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {chamberCutaway && (
        <group name="InternalChamberAnatomy">
          <mesh position={[0.06, -0.12, -0.05]} geometry={septumGeo}>
            <meshStandardMaterial
              color="#701a31"
              roughness={0.55}
              metalness={0.06}
              transparent={isTranslucent}
              opacity={heartOpacity}
            />
          </mesh>
          <mesh position={[0.32, -0.38, 0.05]} rotation={[0.1, 0, -0.2]} geometry={papillaryGeo}>
            <meshStandardMaterial color="#881337" roughness={0.5} />
          </mesh>
          <mesh position={[-0.22, -0.35, 0.08]} rotation={[0.1, 0, 0.2]} geometry={papillaryGeo}>
            <meshStandardMaterial color="#881337" roughness={0.5} />
          </mesh>
          <mesh position={[0.26, 0.32, 0.06]} rotation={[Math.PI / 2, 0, 0.2]} geometry={valveRingGeo}>
            <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
          </mesh>
          <mesh position={[-0.20, 0.30, 0.08]} rotation={[Math.PI / 2, 0, -0.2]} geometry={valveRingGeo}>
            <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
          </mesh>
          <mesh position={[0.29, -0.05, 0.06]} rotation={[0.05, 0, -0.08]} geometry={chordaeGeo}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          <mesh position={[0.34, -0.08, 0.04]} rotation={[-0.05, 0, -0.15]} geometry={chordaeGeo}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          <mesh position={[-0.21, -0.05, 0.08]} rotation={[0.05, 0, 0.08]} geometry={chordaeGeo}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Right Atrium */}
      <mesh
        geometry={atriaGeo}
        position={[-0.38, 0.72, -0.12]}
        scale={[0.45, 0.38, 0.38]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#7f1d1d"
          roughness={0.55}
          metalness={0.06}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* Left Atrium */}
      <mesh
        geometry={atriaGeo}
        position={[0.34, 0.75, -0.20]}
        scale={[0.42, 0.36, 0.36]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#7f1d1d"
          roughness={0.55}
          metalness={0.06}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* Ascending Aorta Root & Arch */}
      <mesh
        geometry={aortaGeo}
        position={[0.06, 0.95, 0.10]}
        rotation={[-0.2, 0, -0.1]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#be123c"
          roughness={0.42}
          metalness={0.10}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* 3 Aortic Arch Arterial Branches */}
      <mesh geometry={branchGeo} position={[-0.04, 1.35, 0.04]} rotation={[-0.1, 0, -0.15]}>
        <meshStandardMaterial color="#be123c" roughness={0.42} />
      </mesh>
      <mesh geometry={branchGeo} position={[0.08, 1.38, 0.02]} rotation={[-0.15, 0, 0]}>
        <meshStandardMaterial color="#be123c" roughness={0.42} />
      </mesh>
      <mesh geometry={branchGeo} position={[0.20, 1.34, 0.00]} rotation={[-0.15, 0, 0.18]}>
        <meshStandardMaterial color="#be123c" roughness={0.42} />
      </mesh>

      {/* Pulmonary Trunk */}
      <mesh
        geometry={pulmonaryGeo}
        position={[0.16, 0.82, 0.28]}
        rotation={[-0.35, 0.2, 0.3]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#3730a3"
          roughness={0.48}
          metalness={0.08}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* Superior Vena Cava (SVC) */}
      <mesh
        geometry={svcGeo}
        position={[-0.45, 1.15, -0.22]}
        rotation={[0.05, 0, -0.05]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#312e81"
          roughness={0.50}
          metalness={0.08}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>
    </group>
  );
};

/**
 * Photorealistic Beating Heart Model (Beating_heart.glb)
 * Incorporates Cinema 4D reference cardiac motion and anatomical chamber cutaway dissection.
 */
interface RealisticBeatingHeartProps {
  heartOpacity: number;
}

const RealisticBeatingHeart: React.FC<RealisticBeatingHeartProps> = ({ heartOpacity }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/beating_heart.glb', '/draco/gltf/');
  const { actions, names } = useAnimations(animations, group);
  const invalidate = useThree((state) => state.invalidate);

  // Play skeletal heartbeat animation
  useEffect(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action) {
        action.play();
      }
    }
  }, [actions, names]);

  // Adjust material opacity and transparency based on heartOpacity store state
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            mat.transparent = heartOpacity < 0.98;
            mat.opacity = heartOpacity;
            mat.depthWrite = heartOpacity > 0.85;
          });
        }
      }
    });
    invalidate();
  }, [scene, heartOpacity, invalidate]);

  return (
    <group ref={group} name="RealisticBeatingHeartGLB" dispose={null}>
      <primitive
        object={scene}
        position={[0, -0.83, 0]}
        scale={[10.0, 10.0, 10.0]}
      />
    </group>
  );
};

/**
 * Boundary wrapper catching potential GLTF network or parsing errors
 */
class GLTFErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Pre-load asset for zero-latency presentation
useGLTF.preload('/beating_heart.glb', '/draco/gltf/');

export const Heart: React.FC = () => {
  const heartOpacity = useStore((state) => state.heartOpacity);
  const chamberCutaway = useStore((state) => state.chamberCutaway);

  const fallback = (
    <ProceduralHeart
      heartOpacity={heartOpacity}
      chamberCutaway={chamberCutaway}
    />
  );

  return (
    <GLTFErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <RealisticBeatingHeart heartOpacity={heartOpacity} />
      </Suspense>
    </GLTFErrorBoundary>
  );
};
