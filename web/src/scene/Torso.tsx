import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export const TORSO_MATERIAL_CONFIG = {
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  flatShading: true,
};

export const Torso: React.FC = () => {
  const showTorso = useStore((state) => state.showTorso);

  const torsoGeo = useMemo(() => {
    // 12 radial segments for low-poly stylized faceted look
    const geo = new THREE.CylinderGeometry(1.65, 1.30, 3.8, 12, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Human thorax is wider laterally than anteroposteriorly
      v.x *= 1.35;
      v.z *= 0.92;

      // Shoulder flare at upper thoracic region
      if (v.y > 0.8) {
        v.x *= 1.12;
      }

      // Waist taper at lower thoracic/abdominal margin
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

  if (!showTorso) {
    return null;
  }

  return (
    <group name="TorsoShell" position={[0, -0.1, 0]}>
      {/* Translucent faceted shell: CRITICAL depthWrite=false to prevent occlusion */}
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

      {/* High-contrast structural wireframe edge accents */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent={true}
          opacity={0.25}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};
