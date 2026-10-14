import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export const Heart: React.FC = () => {
  const heartOpacity = useStore((state) => state.heartOpacity);
  const chamberCutaway = useStore((state) => state.chamberCutaway);

  // 1. Procedural myocardium geometry with anatomical deformation
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

      // Cutaway: open the anterior ventricular wall window (z > 0.05, -0.9 < y < 0.65)
      if (v.z > 0.08 && v.y > -0.92 && v.y < 0.58) {
        // Inward recession to create hollow chamber cavity and wall thickness
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

  // Aortic Arch Branches (Brachiocephalic, Left Common Carotid, Left Subclavian)
  const branchGeo = useMemo(() => new THREE.CylinderGeometry(0.055, 0.065, 0.32, 12), []);

  // 4. Epicardial Adipose Tissue (Sulcal fat pads in AV groove & sulci, matching reference video)
  const adiposeTorusGeo = useMemo(() => new THREE.TorusGeometry(0.68, 0.085, 12, 28, Math.PI * 1.6), []);

  // 5. Internal Chamber Dissection Geometry (Interventricular septum, valves, chordae tendineae)
  const septumGeo = useMemo(() => new THREE.BoxGeometry(0.14, 0.95, 0.65), []);
  const valveRingGeo = useMemo(() => new THREE.TorusGeometry(0.18, 0.024, 10, 24), []);
  const chordaeGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), []);
  const papillaryGeo = useMemo(() => new THREE.ConeGeometry(0.08, 0.28, 8), []);

  const isTranslucent = heartOpacity < 0.98;

  return (
    <group name="HeartCompoundMesh">
      {/* Primary Ventricular Myocardium (Standard or Cutaway) */}
      <mesh
        geometry={chamberCutaway ? cutawayMyocardiumGeo : myocardiumGeo}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#881337" // Deep anatomical crimson
          roughness={0.52}
          metalness={0.08}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
          side={chamberCutaway ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {/* Epicardial Adipose Tissue Pads (Fat sulcus along AV groove as seen in reference video) */}
      <mesh
        geometry={adiposeTorusGeo}
        position={[0.02, 0.52, 0.05]}
        rotation={[Math.PI / 2.2, -0.15, 0.3]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#ca8a04" // Warm golden-amber adipose
          roughness={0.62}
          metalness={0.04}
          transparent={isTranslucent}
          opacity={heartOpacity * 0.95}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* Internal Chamber Cutaway Details (Rendered when cutaway is active) */}
      {chamberCutaway && (
        <group name="InternalChamberAnatomy">
          {/* Muscular Interventricular Septum (Dividing LV and RV) */}
          <mesh position={[0.06, -0.12, -0.05]} geometry={septumGeo}>
            <meshStandardMaterial
              color="#701a31"
              roughness={0.55}
              metalness={0.06}
              transparent={isTranslucent}
              opacity={heartOpacity}
            />
          </mesh>

          {/* Left Ventricle Papillary Muscles */}
          <mesh position={[0.32, -0.38, 0.05]} rotation={[0.1, 0, -0.2]} geometry={papillaryGeo}>
            <meshStandardMaterial color="#881337" roughness={0.5} />
          </mesh>

          {/* Right Ventricle Papillary Muscles */}
          <mesh position={[-0.22, -0.35, 0.08]} rotation={[0.1, 0, 0.2]} geometry={papillaryGeo}>
            <meshStandardMaterial color="#881337" roughness={0.5} />
          </mesh>

          {/* Mitral Valve Ring (Left Ventricle Outflow) */}
          <mesh position={[0.26, 0.32, 0.06]} rotation={[Math.PI / 2, 0, 0.2]} geometry={valveRingGeo}>
            <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
          </mesh>

          {/* Tricuspid Valve Ring (Right Ventricle Outflow) */}
          <mesh position={[-0.20, 0.30, 0.08]} rotation={[Math.PI / 2, 0, -0.2]} geometry={valveRingGeo}>
            <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
          </mesh>

          {/* Chordae Tendineae Strings (Mitral) */}
          <mesh position={[0.29, -0.05, 0.06]} rotation={[0.05, 0, -0.08]} geometry={chordaeGeo}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          <mesh position={[0.34, -0.08, 0.04]} rotation={[-0.05, 0, -0.15]} geometry={chordaeGeo}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>

          {/* Chordae Tendineae Strings (Tricuspid) */}
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
          color="#be123c" // Arterial crimson
          roughness={0.42}
          metalness={0.10}
          transparent={isTranslucent}
          opacity={heartOpacity}
          depthWrite={heartOpacity > 0.85}
        />
      </mesh>

      {/* 3 Aortic Arch Arterial Branches (Brachiocephalic, Carotid, Subclavian) */}
      <mesh
        geometry={branchGeo}
        position={[-0.04, 1.35, 0.04]}
        rotation={[-0.1, 0, -0.15]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color="#be123c" roughness={0.42} />
      </mesh>
      <mesh
        geometry={branchGeo}
        position={[0.08, 1.38, 0.02]}
        rotation={[-0.15, 0, 0]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color="#be123c" roughness={0.42} />
      </mesh>
      <mesh
        geometry={branchGeo}
        position={[0.20, 1.34, 0.00]}
        rotation={[-0.15, 0, 0.18]}
        castShadow={false}
        receiveShadow={false}
      >
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
