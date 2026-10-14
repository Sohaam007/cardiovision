import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { TORSO_MATERIAL_CONFIG } from './sceneConfig';

export { TORSO_MATERIAL_CONFIG };

/**
 * 3D Holographic Translucent Torso & Systemic Vasculature
 * Designed strictly to match reference asset 1000_F_856513276_wSIEjhLSeNYV7kQKT4bxHXPU5PPjypED.jpg:
 * 1. Translucent sapphire/obsidian-blue sculpted human torso shell (neck, shoulders, chest, waist, upper arms).
 * 2. Prominent systemic arterial tree in vibrant crimson red (carotids, subclavians, brachials, aorta).
 * 3. Prominent systemic venous tree in cobalt blue (jugulars, brachials, SVC, IVC).
 * 4. Transparent depthWrite: false contract guarantees zero occlusion of the beating heart inside.
 */
export const Torso: React.FC = () => {
  const showTorso = useStore((state) => state.showTorso);

  // =========================================================================
  // 1. SCULPTED HUMAN TORSO MESH (Neck, Trapezius, Shoulders, Chest, Arms, Waist)
  // Matching reference 1000_F_856513276_wSIEjhLSeNYV7kQKT4bxHXPU5PPjypED.jpg
  // =========================================================================
  const torsoGeo = useMemo(() => {
    const radialSegs = 32;
    const heightSegs = 24;
    const geo = new THREE.CylinderGeometry(0.55, 1.35, 4.0, radialSegs, heightSegs, false);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Normalized height t from -1.0 (waist) to +1.0 (neck/throat)
      const t = v.y / 2.0;
      const angle = Math.atan2(v.z, v.x);

      let scaleX = 1.0;
      let scaleZ = 1.0;

      if (t > 0.55) {
        // Upper Neck & Throat (y: 1.1 to 2.0)
        scaleX = 0.82 + (t - 0.55) * 0.15;
        scaleZ = 0.88;
        if (Math.cos(angle) < 0.2 && Math.sin(angle) > 0.7) {
          scaleZ += 0.08;
        }
      } else if (t > 0.25) {
        // Shoulders, Clavicles & Trapezius Flare (y: 0.5 to 1.1)
        const shoulderProgress = (t - 0.25) / 0.30;
        scaleX = 1.85 + Math.sin(shoulderProgress * Math.PI) * 1.65;
        scaleZ = 0.95;
      } else if (t > -0.35) {
        // Thorax, Pectorals & Mid-Ribcage (y: -0.7 to 0.5)
        scaleX = 1.72;
        scaleZ = 1.02;
        if (v.z > 0) {
          scaleZ += 0.14 * Math.cos(v.x * 0.8);
        }
      } else {
        // Waist & Infrasternal Abdominal Taper (y: -2.0 to -0.7)
        const waistProgress = (-0.35 - t) / 0.65;
        scaleX = 1.62 - waistProgress * 0.25;
        scaleZ = 0.92 - waistProgress * 0.12;
      }

      v.x *= scaleX;
      v.z *= scaleZ;

      // Natural thoracic kyphosis curvature
      if (t > -0.3 && t < 0.5) {
        v.z -= 0.05 * Math.sin(((t + 0.3) / 0.8) * Math.PI);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // Upper Arm Meshes (Hanging naturally on left & right sides)
  const armGeos = useMemo(() => {
    const leftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.32, 0.95, 0.00),
      new THREE.Vector3(2.42, 0.35, 0.02),
      new THREE.Vector3(2.40, -0.65, -0.02),
      new THREE.Vector3(2.32, -1.65, -0.04),
    ]);
    const rightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.32, 0.95, 0.00),
      new THREE.Vector3(-2.42, 0.35, 0.02),
      new THREE.Vector3(-2.40, -0.65, -0.02),
      new THREE.Vector3(-2.32, -1.65, -0.04),
    ]);

    return {
      left: new THREE.TubeGeometry(leftCurve, 24, 0.34, 16, false),
      right: new THREE.TubeGeometry(rightCurve, 24, 0.34, 16, false),
    };
  }, []);

  // Structural Wireframe Edge Accents for high-tech holographic depth
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(torsoGeo, 28), [torsoGeo]);

  // =========================================================================
  // 2. SYSTEMIC ARTERIAL VASCULAR TREE (Vibrant Crimson Red Arteries)
  // Matching 1000_F_856513276_wSIEjhLSeNYV7kQKT4bxHXPU5PPjypED.jpg:
  // Ascending aorta arch, Carotids, Subclavians & Brachials, Descending Aorta
  // =========================================================================
  const arterialGeos = useMemo(() => {
    // 1. Right Common Carotid Artery (Ascending through right neck)
    const rightCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.12, 1.35, 0.10),
      new THREE.Vector3(0.18, 1.65, 0.12),
      new THREE.Vector3(0.20, 2.05, 0.12),
    ]);
    // 2. Left Common Carotid Artery (Ascending through left neck)
    const leftCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 1.45, 0.00),
      new THREE.Vector3(-0.08, 1.70, 0.08),
      new THREE.Vector3(-0.12, 2.05, 0.10),
    ]);

    // 3. Right Subclavian & Brachial Artery (Curving across shoulder down right arm)
    const rightBrachial = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 1.40, 0.10),
      new THREE.Vector3(0.85, 1.25, 0.22),
      new THREE.Vector3(1.65, 1.08, 0.15),
      new THREE.Vector3(2.25, 0.75, 0.08),
      new THREE.Vector3(2.35, 0.00, 0.02),
      new THREE.Vector3(2.38, -0.90, -0.02),
      new THREE.Vector3(2.32, -1.75, -0.05),
    ]);
    // 4. Left Subclavian & Brachial Artery (Curving across shoulder down left arm)
    const leftBrachial = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 1.40, -0.08),
      new THREE.Vector3(-0.85, 1.25, 0.22),
      new THREE.Vector3(-1.65, 1.08, 0.15),
      new THREE.Vector3(-2.25, 0.75, 0.08),
      new THREE.Vector3(-2.35, 0.00, 0.02),
      new THREE.Vector3(-2.38, -0.90, -0.02),
      new THREE.Vector3(-2.32, -1.75, -0.05),
    ]);

    // 5. Descending Thoracic & Abdominal Aorta
    const descendingAorta = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.20, 0.65, -0.30),
      new THREE.Vector3(-0.12, 0.00, -0.32),
      new THREE.Vector3(-0.05, -0.65, -0.30),
      new THREE.Vector3(-0.02, -1.25, -0.28),
      new THREE.Vector3(0.00, -1.85, -0.25),
    ]);

    // 6. Lateral Intercostal Artery Branches spreading across chest wall
    const intercostalCurves: THREE.TubeGeometry[] = [];
    const icLevels = [0.45, 0.15, -0.15, -0.45, -0.75];
    icLevels.forEach((y) => {
      // Right branch
      const rCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.05, y, -0.30),
        new THREE.Vector3(0.45, y - 0.04, -0.15),
        new THREE.Vector3(0.95, y - 0.08, 0.12),
        new THREE.Vector3(1.40, y - 0.12, 0.20),
      ]);
      // Left branch
      const lCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.15, y, -0.30),
        new THREE.Vector3(-0.65, y - 0.04, -0.15),
        new THREE.Vector3(-1.15, y - 0.08, 0.12),
        new THREE.Vector3(-1.45, y - 0.12, 0.20),
      ]);
      intercostalCurves.push(new THREE.TubeGeometry(rCurve, 18, 0.016, 8, false));
      intercostalCurves.push(new THREE.TubeGeometry(lCurve, 18, 0.016, 8, false));
    });

    return {
      rightCarotid: new THREE.TubeGeometry(rightCarotid, 20, 0.045, 10, false),
      leftCarotid: new THREE.TubeGeometry(leftCarotid, 20, 0.042, 10, false),
      rightBrachial: new THREE.TubeGeometry(rightBrachial, 36, 0.046, 10, false),
      leftBrachial: new THREE.TubeGeometry(leftBrachial, 36, 0.044, 10, false),
      descendingAorta: new THREE.TubeGeometry(descendingAorta, 32, 0.095, 12, false),
      intercostals: intercostalCurves,
    };
  }, []);

  // =========================================================================
  // 3. SYSTEMIC VENOUS VASCULAR TREE (Cobalt Blue Veins)
  // Jugulars down neck, Subclavian & Brachial veins from arms into SVC
  // =========================================================================
  const venousGeos = useMemo(() => {
    // 1. Right Internal Jugular Vein (Neck into SVC)
    const rightJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 2.05, 0.08),
      new THREE.Vector3(-0.40, 1.65, 0.02),
      new THREE.Vector3(-0.46, 1.30, -0.15),
    ]);
    // 2. Left Internal Jugular Vein
    const leftJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.32, 2.05, 0.08),
      new THREE.Vector3(0.24, 1.65, 0.02),
      new THREE.Vector3(0.00, 1.30, -0.10),
      new THREE.Vector3(-0.42, 1.15, -0.18),
    ]);

    // 3. Right Subclavian & Axillary Vein (From right arm into SVC)
    const rightArmVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.36, -1.70, 0.04),
      new THREE.Vector3(2.40, -0.85, 0.06),
      new THREE.Vector3(2.32, 0.10, 0.10),
      new THREE.Vector3(2.15, 0.70, 0.15),
      new THREE.Vector3(1.50, 1.00, 0.22),
      new THREE.Vector3(0.65, 1.12, 0.20),
      new THREE.Vector3(-0.40, 1.10, -0.15),
    ]);
    // 4. Left Subclavian & Axillary Vein (From left arm into SVC)
    const leftArmVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.36, -1.70, 0.04),
      new THREE.Vector3(-2.40, -0.85, 0.06),
      new THREE.Vector3(-2.32, 0.10, 0.10),
      new THREE.Vector3(-2.15, 0.70, 0.15),
      new THREE.Vector3(-1.50, 1.00, 0.22),
      new THREE.Vector3(-0.75, 1.12, 0.15),
      new THREE.Vector3(-0.46, 1.08, -0.18),
    ]);

    // 5. Inferior Vena Cava (Abdomen into right atrium)
    const ivc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.40, 0.40, -0.22),
      new THREE.Vector3(-0.35, -0.25, -0.25),
      new THREE.Vector3(-0.25, -0.95, -0.24),
      new THREE.Vector3(-0.20, -1.85, -0.22),
    ]);

    return {
      rightJugular: new THREE.TubeGeometry(rightJugular, 20, 0.054, 10, false),
      leftJugular: new THREE.TubeGeometry(leftJugular, 24, 0.050, 10, false),
      rightArmVein: new THREE.TubeGeometry(rightArmVein, 36, 0.052, 10, false),
      leftArmVein: new THREE.TubeGeometry(leftArmVein, 36, 0.050, 10, false),
      ivc: new THREE.TubeGeometry(ivc, 24, 0.092, 12, false),
    };
  }, []);

  // Translucent Holographic Obsidian-Blue Materials matching 1000_F_856513276.jpg
  const shellMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#16325c', // Deep sapphire slate
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 0.70,
      clearcoatRoughness: 0.15,
      transparent: TORSO_MATERIAL_CONFIG.transparent,
      opacity: TORSO_MATERIAL_CONFIG.opacity,
      depthWrite: TORSO_MATERIAL_CONFIG.depthWrite,
      side: THREE.DoubleSide,
      flatShading: TORSO_MATERIAL_CONFIG.flatShading,
    });
  }, []);

  const systemicArteryMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#e11d48', // Vibrant systemic arterial crimson red
      roughness: 0.20,
      metalness: 0.08,
      clearcoat: 0.60,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
    });
  }, []);

  const systemicVenousMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#2563eb', // Vibrant systemic venous cobalt blue
      roughness: 0.20,
      metalness: 0.08,
      clearcoat: 0.60,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
    });
  }, []);

  if (!showTorso) {
    return null;
  }

  return (
    <group name="TorsoAnatomicalSystem" position={[0, -0.05, 0]}>
      {/* ============================================================== */}
      {/* 1. TRANSLUCENT OBSIDIAN-BLUE HOLOGRAPHIC TORSO & ARMS SHELL   */}
      {/* ============================================================== */}
      <mesh geometry={torsoGeo} material={shellMaterial} castShadow={false} receiveShadow={false} />
      <mesh geometry={armGeos.left} material={shellMaterial} />
      <mesh geometry={armGeos.right} material={shellMaterial} />

      {/* Subtle Holographic Edge Rings */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#38bdf8" transparent={true} opacity={0.16} depthWrite={false} />
      </lineSegments>

      {/* ============================================================== */}
      {/* 2. SYSTEMIC ARTERIAL TREE (Red Carotids, Brachials, Aorta)    */}
      {/* ============================================================== */}
      <mesh geometry={arterialGeos.rightCarotid} material={systemicArteryMaterial} />
      <mesh geometry={arterialGeos.leftCarotid} material={systemicArteryMaterial} />
      <mesh geometry={arterialGeos.rightBrachial} material={systemicArteryMaterial} />
      <mesh geometry={arterialGeos.leftBrachial} material={systemicArteryMaterial} />
      <mesh geometry={arterialGeos.descendingAorta} material={systemicArteryMaterial} />
      {arterialGeos.intercostals.map((geo, idx) => (
        <mesh key={`ic_art_${idx}`} geometry={geo} material={systemicArteryMaterial} />
      ))}

      {/* ============================================================== */}
      {/* 3. SYSTEMIC VENOUS TREE (Blue Jugulars, Brachials, Vena Cava) */}
      {/* ============================================================== */}
      <mesh geometry={venousGeos.rightJugular} material={systemicVenousMaterial} />
      <mesh geometry={venousGeos.leftJugular} material={systemicVenousMaterial} />
      <mesh geometry={venousGeos.rightArmVein} material={systemicVenousMaterial} />
      <mesh geometry={venousGeos.leftArmVein} material={systemicVenousMaterial} />
      <mesh geometry={venousGeos.ivc} material={systemicVenousMaterial} />
    </group>
  );
};
