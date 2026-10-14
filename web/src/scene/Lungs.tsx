import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';

/**
 * Photorealistic Anatomical Lungs Component
 * 1. Left Lung: Bilobed (superior and inferior lobes) with a distinct **cardiac notch**
 *    and lingula accommodating the left ventricle and apex of the heart.
 * 2. Right Lung: Trilobed (superior, middle, inferior lobes).
 * 3. Soft, translucent pulmonary parenchyma (pinkish-slate) with delicate bronchial tree silhouette.
 * 4. Physiological respiratory tidal breathing motion support.
 * 5. Synchronized clipping plane support when dissection is enabled.
 * 6. depthWrite: false ensures zero occlusion of the beating heart inside.
 */
export const Lungs: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const isInvertedCut = useStore((state) => state.isInvertedCut);

  const rightLungRef = useRef<THREE.Group>(null);
  const leftLungRef = useRef<THREE.Group>(null);
  const bronchialTreeRef = useRef<THREE.Group>(null);

  // Synchronized surgical clipping plane matching Heart and Torso
  const clippingPlane = useMemo(() => {
    if (!isCutOpen) return null;

    let plane: THREE.Plane;
    if (dissectionPlane === 'coronal') {
      plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.52 - cutDepth * 0.92);
    } else if (dissectionPlane === 'short_axis') {
      plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.45 - cutDepth * 1.05);
    } else {
      plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.40 - cutDepth * 0.85);
    }
    return isInvertedCut ? plane.negate() : plane;
  }, [isCutOpen, dissectionPlane, cutDepth, isInvertedCut]);

  // Soft, subtle ghosted pulmonary parenchyma material (slate-blue aerated lung tissue)
  // Maintains depthWrite: false and low opacity (0.18) so beating heart and vascular tree are brilliantly clear
  const parenchymaMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#3b536f', // Subtle ghosted slate-blue parenchyma
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.40,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.18, // 0.18 - 0.24 per reference image & design contract
      depthWrite: false, // Critical: heart remains brilliantly visible inside
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // Delicate bronchial tree silhouette material (pale cyan cartilaginous airway)
  const airwayMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#7dd3fc',
      roughness: 0.25,
      metalness: 0.08,
      clearcoat: 0.50,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.22, // 0.18 - 0.24 per reference image & design contract
      depthWrite: false,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // =========================================================================
  // 1. RIGHT LUNG: TRILOBED (Superior, Middle, Inferior Lobes)
  // =========================================================================
  const rightLungGeos = useMemo(() => {
    // A. Right Superior Lobe (RUL): Tapered apex cupola to horizontal/oblique fissure
    const rulGeo = new THREE.SphereGeometry(1.0, 32, 24);
    const rulPos = rulGeo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < rulPos.count; i++) {
      v.fromBufferAttribute(rulPos, i);

      // Scale to anatomical lobe dimensions
      let x = v.x * 0.44;
      let y = v.y * 0.36;
      let z = v.z * 0.48;

      // Superior apex tapering
      if (y > 0) {
        const taper = 1.0 - (y / 0.36) * 0.35;
        x *= taper;
        z *= taper;
      }

      // Medial flattening for mediastinum (SVC / trachea)
      if (x < 0) {
        x *= 0.75;
      }

      // Truncate at horizontal fissure inferiorly
      if (y < -0.15 && z > -0.05) {
        y = -0.15 + (y + 0.15) * 0.25;
      }

      rulPos.setXYZ(i, x, y, z);
    }
    rulGeo.computeVertexNormals();

    // B. Right Middle Lobe (RML): Wedge-shaped anterior lobe
    const rmlGeo = new THREE.SphereGeometry(1.0, 28, 20);
    const rmlPos = rmlGeo.attributes.position;

    for (let i = 0; i < rmlPos.count; i++) {
      v.fromBufferAttribute(rmlPos, i);

      let x = v.x * 0.42;
      let y = v.y * 0.22;
      let z = v.z * 0.38;

      // Flatten superior surface along horizontal fissure
      if (y > 0.08) {
        y = 0.08 + (y - 0.08) * 0.25;
      }

      // Oblique fissure sloping downward and forward
      if (y < -0.05 && z < 0) {
        y = -0.05 + (y + 0.05) * 0.30;
      }

      // Medial cardiac impression (right atrium)
      if (x < 0) {
        x *= 0.70;
      }

      rmlPos.setXYZ(i, x, y, z);
    }
    rmlGeo.computeVertexNormals();

    // C. Right Inferior Lobe (RLL): Large posterior-inferior lobe
    const rllGeo = new THREE.SphereGeometry(1.0, 32, 24);
    const rllPos = rllGeo.attributes.position;

    for (let i = 0; i < rllPos.count; i++) {
      v.fromBufferAttribute(rllPos, i);

      let x = v.x * 0.46;
      let y = v.y * 0.42;
      let z = v.z * 0.50;

      // Concave diaphragmatic base
      if (y < -0.20) {
        const r = Math.sqrt(x * x + z * z);
        y += Math.max(0, (0.40 - r) * 0.22);
      }

      // Posterior convex paravertebral volume
      if (z < 0) {
        z *= 1.15;
      }

      rllPos.setXYZ(i, x, y, z);
    }
    rllGeo.computeVertexNormals();

    return {
      rul: rulGeo,
      rml: rmlGeo,
      rll: rllGeo,
    };
  }, []);

  // =========================================================================
  // 2. LEFT LUNG: BILOBED with CARDIAC NOTCH & LINGULA
  // =========================================================================
  const leftLungGeos = useMemo(() => {
    // A. Left Superior Lobe (LUL): Distinct CARDIAC NOTCH & LINGULA
    const lulGeo = new THREE.SphereGeometry(1.0, 36, 28);
    const lulPos = lulGeo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < lulPos.count; i++) {
      v.fromBufferAttribute(lulPos, i);

      let x = v.x * 0.44;
      let y = v.y * 0.42;
      let z = v.z * 0.48;

      // Superior apex tapering
      if (y > 0) {
        const taper = 1.0 - (y / 0.42) * 0.35;
        x *= taper;
        z *= taper;
      }

      // DISTINCT CARDIAC NOTCH (Incisura Cardiaca):
      // On anteromedial border, carved out to accommodate left ventricle & cardiac apex
      // Located at medial aspect (x > -0.15 in local lobe space), y between -0.40 and 0.10, z > -0.10
      if (x > -0.15 && y < 0.15 && y > -0.45 && z > -0.10) {
        const notchFactor = Math.cos(((y + 0.15) / 0.30) * (Math.PI / 2.0));
        // Deep indentation carving inward laterally (negative local X is lateral for left lung)
        x -= notchFactor * 0.24;
      }

      // LINGULA OF LEFT LUNG:
      // Tongue-like anteroinferior projection below the cardiac notch
      // At y from -0.35 to -0.50, z from 0.15 to 0.40, sweeping medially & forward around the apex
      if (y < -0.28 && z > 0.10) {
        const lingulaFactor = Math.sin(((y + 0.50) / 0.22) * Math.PI);
        if (lingulaFactor > 0) {
          x += lingulaFactor * 0.14; // Projects medially toward heart apex
          z += lingulaFactor * 0.08; // Curves forward
        }
      }

      lulPos.setXYZ(i, x, y, z);
    }
    lulGeo.computeVertexNormals();

    // B. Left Inferior Lobe (LLL): Posterior-inferior lobe
    const lllGeo = new THREE.SphereGeometry(1.0, 32, 24);
    const lllPos = lllGeo.attributes.position;

    for (let i = 0; i < lllPos.count; i++) {
      v.fromBufferAttribute(lllPos, i);

      let x = v.x * 0.44;
      let y = v.y * 0.42;
      let z = v.z * 0.50;

      // Concave diaphragmatic base
      if (y < -0.20) {
        const r = Math.sqrt(x * x + z * z);
        y += Math.max(0, (0.40 - r) * 0.20);
      }

      // Medial vertical sulcus for descending thoracic aorta
      if (x > 0.10 && z < 0.0) {
        x -= 0.08;
      }

      lllPos.setXYZ(i, x, y, z);
    }
    lllGeo.computeVertexNormals();

    return {
      lul: lulGeo,
      lll: lllGeo,
    };
  }, []);

  // =========================================================================
  // 3. DELICATE BRONCHIAL TREE SILHOUETTE
  // Trachea, Carina, Right/Left Main Bronchi, Lobar & Segmental Branches
  // =========================================================================
  const bronchialGeos = useMemo(() => {
    // 1. Trachea (Midline)
    const tracheaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 1.25, -0.24),
      new THREE.Vector3(0.0, 0.90, -0.25),
      new THREE.Vector3(0.0, 0.55, -0.24), // Carina
    ]);

    // 2. Right Main Bronchus & Lobar Branches
    const rightMainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.55, -0.24),
      new THREE.Vector3(0.18, 0.48, -0.22),
      new THREE.Vector3(0.35, 0.42, -0.20),
    ]);
    const rightUpperLobarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.35, 0.42, -0.20),
      new THREE.Vector3(0.55, 0.55, -0.16),
      new THREE.Vector3(0.72, 0.70, -0.12),
    ]);
    const rightMiddleLobarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.35, 0.42, -0.20),
      new THREE.Vector3(0.52, 0.25, -0.05),
      new THREE.Vector3(0.70, 0.10, 0.12),
    ]);
    const rightLowerLobarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.35, 0.42, -0.20),
      new THREE.Vector3(0.50, 0.15, -0.22),
      new THREE.Vector3(0.68, -0.18, -0.25),
      new THREE.Vector3(0.80, -0.45, -0.28),
    ]);

    // 3. Left Main Bronchus & Lobar Branches
    const leftMainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.55, -0.24),
      new THREE.Vector3(-0.20, 0.46, -0.22),
      new THREE.Vector3(-0.38, 0.38, -0.20),
    ]);
    const leftUpperLobarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.38, -0.20),
      new THREE.Vector3(-0.56, 0.50, -0.16),
      new THREE.Vector3(-0.72, 0.68, -0.12),
    ]);
    // Lingular branch extending into lingula
    const leftLingularCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.56, 0.50, -0.16),
      new THREE.Vector3(-0.64, 0.20, 0.05),
      new THREE.Vector3(-0.62, -0.15, 0.22),
    ]);
    const leftLowerLobarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.38, -0.20),
      new THREE.Vector3(-0.52, 0.12, -0.22),
      new THREE.Vector3(-0.68, -0.20, -0.25),
      new THREE.Vector3(-0.80, -0.45, -0.28),
    ]);

    return {
      trachea: new THREE.TubeGeometry(tracheaCurve, 20, 0.052, 12, false),
      rightMain: new THREE.TubeGeometry(rightMainCurve, 16, 0.040, 10, false),
      rightUpper: new THREE.TubeGeometry(rightUpperLobarCurve, 18, 0.028, 8, false),
      rightMiddle: new THREE.TubeGeometry(rightMiddleLobarCurve, 18, 0.026, 8, false),
      rightLower: new THREE.TubeGeometry(rightLowerLobarCurve, 22, 0.032, 8, false),
      leftMain: new THREE.TubeGeometry(leftMainCurve, 18, 0.038, 10, false),
      leftUpper: new THREE.TubeGeometry(leftUpperLobarCurve, 18, 0.028, 8, false),
      leftLingular: new THREE.TubeGeometry(leftLingularCurve, 18, 0.022, 8, false),
      leftLower: new THREE.TubeGeometry(leftLowerLobarCurve, 22, 0.032, 8, false),
    };
  }, []);

  // =========================================================================
  // 4. BREATHING MOTION (Subtle physiological tidal respiration)
  // ~14 breaths per minute sinusoidal cycle
  // =========================================================================
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const breathCycle = Math.sin(time * 1.45); // ~14 bpm

    // Respiration expansion & diaphragmatic excursion
    const scaleXZ = 1.0 + breathCycle * 0.026;
    const scaleY = 1.0 + breathCycle * 0.016;
    const yShift = -breathCycle * 0.010;

    if (rightLungRef.current) {
      rightLungRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
      rightLungRef.current.position.y = yShift;
    }
    if (leftLungRef.current) {
      leftLungRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
      leftLungRef.current.position.y = yShift;
    }
    if (bronchialTreeRef.current) {
      bronchialTreeRef.current.scale.set(1.0 + breathCycle * 0.012, scaleY, 1.0 + breathCycle * 0.012);
      bronchialTreeRef.current.position.y = yShift * 0.5;
    }
  });

  return (
    <group name="PulmonarySystem" position={[0, -0.05, 0]}>
      {/* 1. RIGHT LUNG (Trilobed: RUL, RML, RLL) */}
      <group ref={rightLungRef} name="RightLungGroup">
        {/* Right Superior Lobe */}
        <mesh
          geometry={rightLungGeos.rul}
          material={parenchymaMaterial}
          position={[0.88, 0.58, -0.05]}
        />
        {/* Right Middle Lobe */}
        <mesh
          geometry={rightLungGeos.rml}
          material={parenchymaMaterial}
          position={[0.85, 0.08, 0.18]}
        />
        {/* Right Inferior Lobe */}
        <mesh
          geometry={rightLungGeos.rll}
          material={parenchymaMaterial}
          position={[0.88, -0.26, -0.15]}
        />
      </group>

      {/* 2. LEFT LUNG (Bilobed: LUL with Cardiac Notch & Lingula, LLL) */}
      <group ref={leftLungRef} name="LeftLungGroup">
        {/* Left Superior Lobe with distinct CARDIAC NOTCH & LINGULA */}
        <mesh
          geometry={leftLungGeos.lul}
          material={parenchymaMaterial}
          position={[-0.86, 0.42, 0.05]}
        />
        {/* Left Inferior Lobe */}
        <mesh
          geometry={leftLungGeos.lll}
          material={parenchymaMaterial}
          position={[-0.88, -0.28, -0.15]}
        />
      </group>

      {/* 3. DELICATE BRONCHIAL TREE SILHOUETTE */}
      <group ref={bronchialTreeRef} name="BronchialTree">
        <mesh geometry={bronchialGeos.trachea} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.rightMain} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.rightUpper} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.rightMiddle} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.rightLower} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.leftMain} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.leftUpper} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.leftLingular} material={airwayMaterial} />
        <mesh geometry={bronchialGeos.leftLower} material={airwayMaterial} />
      </group>
    </group>
  );
};
