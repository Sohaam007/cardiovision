import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { TORSO_MATERIAL_CONFIG } from './sceneConfig';

export { TORSO_MATERIAL_CONFIG };

export const Torso: React.FC = () => {
  const showTorso = useStore((state) => state.showTorso);

  // 1. Anatomical Torso Silhouette Mesh (Body contour with neck, shoulders, chest, and arms)
  const torsoGeo = useMemo(() => {
    // 14 radial segments, 6 height segments for low-poly stylized faceted appearance
    const geo = new THREE.CylinderGeometry(1.65, 1.30, 3.8, 12, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Human thorax is broader laterally (x) than anteroposteriorly (z)
      v.x *= 1.35;
      v.z *= 0.92;

      // Shoulder flare at upper thoracic region
      if (v.y > 0.8) {
        v.x *= 1.15;
      }

      // Waist taper at lower thoracic margin
      if (v.y < -0.8) {
        v.x *= 0.88;
        v.z *= 0.88;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(torsoGeo, 18), [torsoGeo]);

  // 2. Anatomical Thoracic Rib Cage (Pairs of curved ribs + sternum + vertebral column)
  const { ribGeometries, sternumGeo, spineGeo } = useMemo(() => {
    const ribs: THREE.BufferGeometry[] = [];
    const ribPairs = 8;

    for (let i = 0; i < ribPairs; i++) {
      const y = 0.85 - i * 0.22;
      const width = 1.05 + 0.25 * Math.sin((i / (ribPairs - 1)) * Math.PI);
      const depth = 0.85 + 0.15 * Math.sin((i / (ribPairs - 1)) * Math.PI);

      // Left rib curve
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.08, y + 0.05, -depth * 0.92), // Vertebral attachment
        new THREE.Vector3(width * 0.65, y + 0.02, -depth * 0.65), // Posterior angle
        new THREE.Vector3(width * 0.95, y - 0.04, 0.0), // Lateral mid-axillary
        new THREE.Vector3(width * 0.62, y - 0.09, depth * 0.72), // Anterior costal cartilage
        new THREE.Vector3(0.12, y - 0.12, depth * 0.82), // Sternal junction
      ]);

      // Right rib curve
      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, y + 0.05, -depth * 0.92),
        new THREE.Vector3(-width * 0.65, y + 0.02, -depth * 0.65),
        new THREE.Vector3(-width * 0.95, y - 0.04, 0.0),
        new THREE.Vector3(-width * 0.62, y - 0.09, depth * 0.72),
        new THREE.Vector3(-0.12, y - 0.12, depth * 0.82),
      ]);

      ribs.push(new THREE.TubeGeometry(leftCurve, 10, 0.022, 6, false));
      ribs.push(new THREE.TubeGeometry(rightCurve, 10, 0.022, 6, false));
    }

    // Anterior Sternum Plate
    const sternum = new THREE.BoxGeometry(0.18, 1.45, 0.04);

    // Posterior Vertebral Column (Spine)
    const spine = new THREE.CylinderGeometry(0.08, 0.09, 2.2, 10);

    return { ribGeometries: ribs, sternumGeo: sternum, spineGeo: spine };
  }, []);

  // 3. Systemic Arterial Network (Red vessels matching reference image)
  const arterialGeometries = useMemo(() => {
    // A. Descending Thoracic & Abdominal Aorta
    const descendingAortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 0.95, 0.08),
      new THREE.Vector3(0.04, 0.50, -0.22),
      new THREE.Vector3(0.02, 0.00, -0.35),
      new THREE.Vector3(0.01, -0.70, -0.40),
      new THREE.Vector3(0.00, -1.50, -0.42),
    ]);
    const descendingAorta = new THREE.TubeGeometry(descendingAortaCurve, 16, 0.065, 8, false);

    // B. Right & Left Common Carotid Arteries (Neck/Head)
    const leftCarotidCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 1.38, 0.02),
      new THREE.Vector3(0.14, 1.70, 0.00),
      new THREE.Vector3(0.16, 2.10, -0.05),
    ]);
    const rightCarotidCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 1.35, 0.04),
      new THREE.Vector3(-0.14, 1.70, 0.00),
      new THREE.Vector3(-0.16, 2.10, -0.05),
    ]);
    const leftCarotid = new THREE.TubeGeometry(leftCarotidCurve, 10, 0.038, 6, false);
    const rightCarotid = new THREE.TubeGeometry(rightCarotidCurve, 10, 0.038, 6, false);

    // C. Right & Left Subclavian & Brachial Arteries (Shoulders and Arms)
    const leftArmArteryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.20, 1.34, 0.00),
      new THREE.Vector3(0.70, 1.25, -0.05),
      new THREE.Vector3(1.30, 0.90, -0.10),
      new THREE.Vector3(1.65, 0.20, -0.12),
      new THREE.Vector3(1.75, -0.80, -0.14),
    ]);
    const rightArmArteryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.20, 1.34, 0.00),
      new THREE.Vector3(-0.70, 1.25, -0.05),
      new THREE.Vector3(-1.30, 0.90, -0.10),
      new THREE.Vector3(-1.65, 0.20, -0.12),
      new THREE.Vector3(-1.75, -0.80, -0.14),
    ]);
    const leftArmArtery = new THREE.TubeGeometry(leftArmArteryCurve, 14, 0.042, 6, false);
    const rightArmArtery = new THREE.TubeGeometry(rightArmArteryCurve, 14, 0.042, 6, false);

    // D. Intercostal Arterial Branches
    const intercostals: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const y = 0.40 - i * 0.26;
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.04, y, -0.32),
        new THREE.Vector3(0.55, y - 0.02, -0.38),
        new THREE.Vector3(0.85, y - 0.05, -0.15),
      ]);
      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.00, y, -0.32),
        new THREE.Vector3(-0.55, y - 0.02, -0.38),
        new THREE.Vector3(-0.85, y - 0.05, -0.15),
      ]);
      intercostals.push(new THREE.TubeGeometry(leftCurve, 8, 0.016, 5, false));
      intercostals.push(new THREE.TubeGeometry(rightCurve, 8, 0.016, 5, false));
    }

    return [descendingAorta, leftCarotid, rightCarotid, leftArmArtery, rightArmArtery, ...intercostals];
  }, []);

  // 4. Systemic Venous Network (Blue vessels matching reference image)
  const venousGeometries = useMemo(() => {
    // A. Inferior Vena Cava (IVC)
    const ivcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.10, -1.50, -0.36),
      new THREE.Vector3(-0.12, -0.70, -0.32),
      new THREE.Vector3(-0.18, 0.00, -0.24),
      new THREE.Vector3(-0.25, 0.50, -0.15),
    ]);
    const ivc = new THREE.TubeGeometry(ivcCurve, 14, 0.075, 8, false);

    // B. Internal Jugular Veins (Neck to SVC)
    const leftJugularCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.20, 2.10, -0.04),
      new THREE.Vector3(0.18, 1.65, 0.02),
      new THREE.Vector3(0.02, 1.25, 0.04),
      new THREE.Vector3(-0.35, 1.15, -0.15),
    ]);
    const rightJugularCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 2.10, -0.04),
      new THREE.Vector3(-0.24, 1.65, 0.02),
      new THREE.Vector3(-0.35, 1.25, -0.12),
    ]);
    const leftJugular = new THREE.TubeGeometry(leftJugularCurve, 10, 0.042, 6, false);
    const rightJugular = new THREE.TubeGeometry(rightJugularCurve, 10, 0.042, 6, false);

    // C. Subclavian & Brachial Veins (Arms returning to SVC)
    const leftArmVeinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.72, -0.80, -0.10),
      new THREE.Vector3(1.62, 0.20, -0.08),
      new THREE.Vector3(1.25, 0.90, -0.05),
      new THREE.Vector3(0.65, 1.20, 0.00),
      new THREE.Vector3(-0.30, 1.15, -0.15),
    ]);
    const rightArmVeinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.72, -0.80, -0.10),
      new THREE.Vector3(-1.62, 0.20, -0.08),
      new THREE.Vector3(-1.25, 0.90, -0.05),
      new THREE.Vector3(-0.70, 1.20, -0.02),
      new THREE.Vector3(-0.40, 1.15, -0.15),
    ]);
    const leftArmVein = new THREE.TubeGeometry(leftArmVeinCurve, 14, 0.046, 6, false);
    const rightArmVein = new THREE.TubeGeometry(rightArmVeinCurve, 14, 0.046, 6, false);

    return [ivc, leftJugular, rightJugular, leftArmVein, rightArmVein];
  }, []);

  if (!showTorso) {
    return null;
  }

  return (
    <group name="AnatomicalThoraxSystem" position={[0, -0.1, 0]}>
      {/* 1. Translucent Body Shell: Mandatory depthWrite=false to prevent occlusion of internal heart */}
      <mesh geometry={torsoGeo} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.6}
          metalness={0.1}
          transparent={TORSO_MATERIAL_CONFIG.transparent}
          opacity={TORSO_MATERIAL_CONFIG.opacity}
          depthWrite={TORSO_MATERIAL_CONFIG.depthWrite}
          side={THREE.DoubleSide}
          flatShading={TORSO_MATERIAL_CONFIG.flatShading}
        />
      </mesh>

      {/* Structural Wireframe Edges */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent={true}
          opacity={0.18}
          depthWrite={false}
        />
      </lineSegments>

      {/* 2. Thoracic Rib Cage (Matching Reference Screenshot) */}
      <group name="ThoracicRibCage">
        {/* Costal Cartilages & Rib Arches */}
        {ribGeometries.map((geo, idx) => (
          <mesh key={`rib-${idx}`} geometry={geo} castShadow={false} receiveShadow={false}>
            <meshStandardMaterial
              color="#cbd5e1" // Translucent ivory/bone
              roughness={0.45}
              metalness={0.05}
              transparent={true}
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Anterior Sternum */}
        <mesh position={[0.0, 0.22, 0.88]} geometry={sternumGeo}>
          <meshStandardMaterial
            color="#e2e8f0"
            roughness={0.4}
            transparent={true}
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>

        {/* Posterior Spine */}
        <mesh position={[0.0, 0.15, -0.85]} geometry={spineGeo}>
          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.5}
            transparent={true}
            opacity={0.20}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 3. Systemic Arterial Network (Red Vessels) */}
      <group name="SystemicArteries">
        {arterialGeometries.map((geo, idx) => (
          <mesh key={`artery-${idx}`} geometry={geo} castShadow={false} receiveShadow={false}>
            <meshStandardMaterial
              color="#dc2626" // Arterial crimson red
              emissive="#7f1d1d"
              emissiveIntensity={0.25}
              roughness={0.42}
              metalness={0.1}
              transparent={true}
              opacity={0.75}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* 4. Systemic Venous Network (Blue Vessels) */}
      <group name="SystemicVeins">
        {venousGeometries.map((geo, idx) => (
          <mesh key={`vein-${idx}`} geometry={geo} castShadow={false} receiveShadow={false}>
            <meshStandardMaterial
              color="#2563eb" // Venous cobalt blue
              emissive="#1e3a8a"
              emissiveIntensity={0.25}
              roughness={0.48}
              metalness={0.08}
              transparent={true}
              opacity={0.72}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
