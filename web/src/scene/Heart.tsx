import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export const Heart: React.FC = () => {
  const heartOpacity = useStore((state) => state.heartOpacity);

  // Procedural myocardium geometry with anatomical deformation
  const myocardiumGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 48, 36);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Height parameter t in [0, 1] from inferior (-1) to superior (+1)
      const t = Math.max(0, Math.min(1, (v.y + 1.0) / 2.0));

      // Anatomical conical tapering towards the apex (-y)
      const taper = 0.32 + 0.68 * Math.sqrt(t);
      v.x *= taper;
      v.z *= taper;

      // Left ventricle muscular bulge (patient left, x > 0)
      if (v.x > 0) {
        v.x *= 1.14;
      }

      // Posterior diaphragmatic flattening (z < 0)
      if (v.z < 0) {
        v.z *= 0.84;
      }

      // Anterior interventricular groove indentation where LAD runs
      if (v.z > 0 && v.x > 0.12 && v.x < 0.42) {
        const distFromGrooveCenter = Math.abs(v.x - 0.28) / 0.15;
        const indent = Math.max(0, 1.0 - distFromGrooveCenter) * 0.055;
        v.z -= indent;
      }

      // Elongate along long axis
      v.y *= 1.15;

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  const atriaGeo = useMemo(() => new THREE.SphereGeometry(1.0, 24, 20), []);
  const aortaGeo = useMemo(() => new THREE.CylinderGeometry(0.20, 0.22, 0.75, 24), []);
  const pulmonaryGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.18, 0.65, 20), []);
  const svcGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.13, 0.55, 16), []);

  const isTranslucent = heartOpacity < 0.98;

  return (
    <group name="HeartCompoundMesh">
      {/* Primary Ventricular Myocardium */}
      <mesh geometry={myocardiumGeo} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color="#881337" // Deep anatomical crimson
          roughness={0.52}
          metalness={0.08}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

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

      {/* Ascending Aorta Root */}
      <mesh
        geometry={aortaGeo}
        position={[0.06, 0.95, 0.10]}
        rotation={[-0.2, 0, -0.1]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#be123c" // Arterial crimson
          roughness={0.42}
          metalness={0.10}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
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
          color="#3730a3" // Venous blue/slate
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
