import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { computeCardiacMotion } from './cardiacMotion';

/**
 * Creates a procedural fibrous collagen texture for the pericardial sac.
 * Features subtle criss-crossing collagen fibrils and serous fluid sheen.
 */
function createPericardiumTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base translucent pearlescent tone
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Woven collagen fiber bundles (criss-cross lattice)
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 1.2;

  // Longitudinal & helical collagen fibers
  for (let x = 0; x < 1024; x += 8) {
    ctx.strokeStyle = x % 16 === 0 ? '#cbd5e1' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < 1024; y += 32) {
      const dx = Math.sin(y * 0.02 + x * 0.01) * 6;
      ctx.lineTo(x + dx, y);
    }
    ctx.stroke();
  }

  // Oblique intersecting elastic fibers
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#e2e8f0';
  for (let y = -512; y < 1536; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + 512);
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Pericardium Component
 * Represents the fibrous pericardial sac enclosing the heart and roots of great vessels.
 * Features:
 * - Anatomically draped fibroserous sac enclosing ventricles and atria up to great vessel roots
 * - Translucent glistening transmission/sheen (MeshPhysicalMaterial with clearcoat and transmission)
 * - Compliant biomechanical response to 60 FPS cardiac cycle
 * - Surgical clipping plane support (cleaved open during dissection)
 * - Opacity dynamically linked to `heartOpacity` store state
 */
export const Pericardium: React.FC = () => {
  const heartOpacity = useStore((state) => state.heartOpacity);
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);

  const pericardiumRef = useRef<THREE.Group>(null);

  // Synchronized surgical clipping plane matching Heart and Vessels
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

  // Biomechanical motion: subtle compliance with cardiac contraction and ejection
  useFrame((state) => {
    const { isBeating, heartRateBpm, beatingSpeed } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    if (pericardiumRef.current) {
      // Pericardial compliance: slight radial expansion during diastole, slight recoil during systole
      const radialScale = 1.0 - motion.contraction * 0.035;
      const verticalScale = 1.0 - motion.shortening * 0.025;
      pericardiumRef.current.scale.set(radialScale, verticalScale, radialScale);
    }
  });

  // Sculpted anatomical fibrous pericardial sac geometry
  const pericardialSacGeo = useMemo(() => {
    // 72x56 resolution sphere deformed to enclose cardiac contours
    const geo = new THREE.SphereGeometry(1.0, 72, 56);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Normalized height in [0, 1] from inferior (-1) to superior (+1)
      const t = Math.max(0, Math.min(1, (v.y + 1.15) / 2.30));

      // Conical pear tapering toward apex
      const taper = 0.28 + 0.74 * Math.pow(t, 0.50);
      v.x *= taper * 1.10;
      v.z *= taper * 1.08;

      // Left ventricular muscular bulge allowance (patient left, x > 0)
      if (v.x > 0) {
        v.x *= 1.20;
      }

      // Anterior allowance for right ventricular outflow, infundibulum and fat cushions
      if (v.z > 0) {
        v.z *= 1.14;
      }

      // Posterior diaphragmatic flattening
      if (v.z < 0) {
        v.z *= 0.86;
      }

      // Rounded apex contour pointing left (+X) and forward (+Z)
      if (v.y < -0.60) {
        const apexFactor = Math.pow(Math.abs(v.y + 0.60) / 0.55, 1.25);
        v.x += 0.052 * apexFactor;
        v.z += 0.035 * apexFactor;
      }

      // Elongate along long axis to cover from diaphragm to great vessels reflection
      v.y *= 1.22;

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // Superior great vessels reflection sleeve geometry (collared transition)
  const reflectionSleeveGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.32, 0.48, 0.35, 32, 1, true);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const fibrousTexture = useMemo(() => createPericardiumTexture(), []);

  // Dynamic opacity: controlled smoothly via heartOpacity, fades out when heartOpacity is low
  const effectiveOpacity = useMemo(() => {
    if (heartOpacity < 0.20) return 0.0;
    // Translucent delicate serous membrane: ranges from 0.08 to 0.26
    return Math.min(0.26, Math.max(0.06, (heartOpacity - 0.20) * 0.28));
  }, [heartOpacity]);

  // Translucent fibrous serous PBR material with glistening clearcoat & high transmission
  const pericardiumMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#e8edf3', // Pale pearlescent fibroserous tone
      map: fibrousTexture,
      roughness: 0.14, // Wet lubricated serous fluid sheen
      metalness: 0.02,
      clearcoat: 1.0, // High specular surgical sheen
      clearcoatRoughness: 0.10,
      transmission: 0.70, // Exact 0.70 transmission of underlying myocardium
      ior: 1.34, // Refractive index of biological serous fluid
      thickness: 0.04,
      transparent: true,
      opacity: effectiveOpacity,
      depthWrite: false, // Prevents alpha occlusion over enclosed heart & vessels
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide, // Visible when cleaved open in surgical dissection
    });
  }, [fibrousTexture, effectiveOpacity, clippingPlane]);

  if (effectiveOpacity <= 0.01) {
    return null;
  }

  return (
    <group ref={pericardiumRef} name="PericardialSacRoot" position={[0, -0.02, 0]}>
      {/* Main Fibrous Pericardial Sac Enclosing Ventricles and Atria */}
      <mesh
        geometry={pericardialSacGeo}
        material={pericardiumMaterial}
        castShadow={false}
        receiveShadow={false}
      />

      {/* Superior Pericardial Reflection Collar around Great Vessel Roots */}
      <mesh
        geometry={reflectionSleeveGeo}
        material={pericardiumMaterial}
        position={[-0.02, 0.78, 0.12]}
        rotation={[0.15, 0, -0.05]}
      />
    </group>
  );
};
