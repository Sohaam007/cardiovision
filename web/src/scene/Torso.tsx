import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { TORSO_MATERIAL_CONFIG } from './sceneConfig';
import { RibCage } from './RibCage';
import { Lungs } from './Lungs';

export { TORSO_MATERIAL_CONFIG };

export interface TorsoProps {
  /**
   * Rendering style for outer thoracic skin shell:
   * - 'holographic': Translucent sapphire/obsidian-blue hologram with cyan Fresnel edge glow.
   * - 'medical_skin': Photorealistic translucent warm epidermal/dermal medical mannequin tone.
   */
  renderingMode?: 'holographic' | 'medical_skin';
  showRibs?: boolean;
  showLungs?: boolean;
  showDiaphragm?: boolean;
  showVasculature?: boolean;
}

/**
 * 3D Photorealistic Anatomical Thoracic Housing & High-Impact Systemic Vasculature
 * Accurately matching reference image 1000_F_856513276_wSIEjhLSeNYV7kQKT4bxHXPU5PPjypED.jpg:
 * 1. Outer Torso Shell: Athletic human torso silhouette (contoured neck, trapezius, shoulders,
 *    upper arm cylinders, chest contours) in holographic translucent sapphire/obsidian-blue
 *    MeshPhysicalMaterial with cyan Fresnel edge glow and depthWrite: false contract.
 * 2. Systemic Arterial Tree: Crimson Red (#dc2626 / #ef4444, high gloss clearcoat: 1.0, roughness: 0.18)
 *    featuring thick ascending aorta & arch, right/left common carotids ascending through neck,
 *    right/left subclavians & brachials arching over shoulders down both arms, descending thoracic aorta,
 *    internal thoracic arteries, thoracoacromial/pectoral arterial tree, and intercostal arteries.
 * 3. Systemic Venous Network: Cobalt Blue (#2563eb / #1d4ed8, clearcoat: 0.9, roughness: 0.20)
 *    featuring large Superior Vena Cava (SVC), right/left brachiocephalic veins, internal/external jugulars,
 *    subclavian & cephalic/basilic arm veins, Inferior Vena Cava (IVC), and thoracic venous branches.
 * 4. Subtle ghosted RibCage & Lungs (opacity: 0.18-0.24, transparent: true, depthWrite: false).
 * 5. Dome-shaped diaphragm with respiratory excursion.
 * 6. Synchronized surgical clipping planes across all components.
 */
export const Torso: React.FC<TorsoProps> = ({
  renderingMode = 'holographic',
  showRibs = false,
  showLungs = true,
  showDiaphragm = true,
  showVasculature = true,
}) => {
  const showTorso = useStore((state) => state.showTorso);
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);

  const diaphragmRef = useRef<THREE.Mesh>(null);

  // Synchronized surgical clipping plane matching Heart, RibCage, and Lungs
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

  // =========================================================================
  // 1. SCULPTED ATHLETIC HUMAN TORSO MESH
  // Contoured Neck, Trapezius, Shoulders, Chest (Pectorals), and Flanks
  // Matching reference image silhouette
  // =========================================================================
  const torsoGeo = useMemo(() => {
    const radialSegs = 48;
    const heightSegs = 40;
    const height = 4.2;
    const geo = new THREE.CylinderGeometry(0.58, 1.45, height, radialSegs, heightSegs, false);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Normalized height t from -1.0 (lower abdomen) to +1.0 (throat/jaw)
      const t = v.y / (height / 2.0);
      const angle = Math.atan2(v.z, v.x);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let scaleX = 1.0;
      let scaleZ = 1.0;

      if (t > 0.52) {
        // Neck & Throat Region (y: 1.1 to 2.1)
        const neckProg = (t - 0.52) / 0.48;
        scaleX = 0.60 + neckProg * 0.08;
        scaleZ = 0.64 + neckProg * 0.05;

        // Thyroid cartilage / Adam's apple projection anteriorly
        if (sinA > 0.65 && t > 0.65 && t < 0.85) {
          scaleZ += 0.09 * (1.0 - Math.abs(t - 0.75) / 0.10);
        }
        // Sternocleidomastoid muscle anterior-lateral columns
        if (sinA > 0.25 && Math.abs(cosA) > 0.45 && Math.abs(cosA) < 0.85) {
          scaleX += 0.06;
          scaleZ += 0.05;
        }
        // Suprasternal notch depression at base of neck anteriorly
        if (sinA > 0.70 && t >= 0.52 && t < 0.60) {
          scaleZ -= 0.08 * (1.0 - (t - 0.52) / 0.08);
        }
      } else if (t > 0.20) {
        // Shoulders, Clavicles & Trapezius Slopes (y: 0.42 to 1.1)
        const sProg = (t - 0.20) / 0.32;
        // Athletic trapezius slope flaring out from neck to deltoid
        scaleX = 1.88 + Math.sin((1.0 - sProg) * (Math.PI / 2)) * 1.70 + Math.sin(sProg * Math.PI) * 0.90;
        scaleZ = 0.96 + Math.sin((1.0 - sProg) * Math.PI) * 0.20;

        // Clavicle anterior horizontal ridge
        if (sinA > 0.35 && t > 0.38 && t < 0.52) {
          scaleZ += 0.08 * Math.sin(((t - 0.38) / 0.14) * Math.PI);
        }
      } else if (t > -0.35) {
        // Thorax, Pectorals & Mid-Ribcage (y: -0.73 to 0.42) - Generously voluminous chest cavity
        scaleX = 1.90;
        scaleZ = 1.10;

        // Pectoralis major muscular fullness on anterior chest wall
        if (sinA > 0 && t > -0.15 && t < 0.35) {
          const pecHeightFactor = Math.sin(((t + 0.15) / 0.50) * Math.PI);
          // Muscular bilateral bulging with central sternal sulcus dip
          const chestBulge = Math.abs(cosA) * (1.0 - Math.abs(cosA) * 0.35);
          scaleZ += 0.28 * pecHeightFactor * chestBulge;
        }

        // Lateral ribcage / latissimus dorsi flank curvature
        if (Math.abs(cosA) > 0.75) {
          scaleX += 0.14 * Math.cos(((t + 0.35) / 0.55) * Math.PI * 0.5);
        }
      } else {
        // Waist, Flanks & Lower Infrasternal Abdomen (y: -2.1 to -0.73)
        const wProg = (-0.35 - t) / 0.65;
        // Athletic V-taper narrowing at waist, slight flare at iliac crest
        const waistTaper = Math.sin(wProg * Math.PI * 0.7);
        scaleX = 1.82 - waistTaper * 0.26;
        scaleZ = 1.04 - waistTaper * 0.14;

        // Costal margin arch flare
        if (t > -0.65 && sinA > 0.2 && Math.abs(cosA) > 0.4) {
          scaleZ += 0.06;
        }
      }

      v.x *= scaleX;
      v.z *= scaleZ;

      // Natural thoracic kyphosis curvature along spine
      if (t > -0.4 && t < 0.55) {
        v.z -= 0.06 * Math.sin(((t + 0.4) / 0.95) * Math.PI);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // Anatomical Upper Arm Cylinders (Deltoid cap to mid-arm)
  const armGeos = useMemo(() => {
    const leftArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.40, 1.10, 0.02),
      new THREE.Vector3(2.52, 0.55, 0.04),
      new THREE.Vector3(2.54, -0.15, 0.01),
      new THREE.Vector3(2.48, -0.95, -0.02),
      new THREE.Vector3(2.40, -1.80, -0.05),
    ]);
    const rightArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.40, 1.10, 0.02),
      new THREE.Vector3(-2.52, 0.55, 0.04),
      new THREE.Vector3(-2.54, -0.15, 0.01),
      new THREE.Vector3(-2.48, -0.95, -0.02),
      new THREE.Vector3(-2.40, -1.80, -0.05),
    ]);

    return {
      left: new THREE.TubeGeometry(leftArmCurve, 28, 0.36, 16, false),
      right: new THREE.TubeGeometry(rightArmCurve, 28, 0.36, 16, false),
    };
  }, []);

  // Structural Wireframe Edge Accents for high-tech holographic depth
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(torsoGeo, 28), [torsoGeo]);

  // =========================================================================
  // 2. DOME-SHAPED DIAPHRAGM MUSCLE
  // Musculo-tendinous partition with right/left domes and central tendon
  // =========================================================================
  const diaphragmGeo = useMemo(() => {
    const radialSegs = 32;
    const ringSegs = 16;
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let rIdx = 0; rIdx <= ringSegs; rIdx++) {
      const ringFrac = rIdx / ringSegs;

      for (let sIdx = 0; sIdx <= radialSegs; sIdx++) {
        const theta = (sIdx / radialSegs) * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const radiusX = ringFrac * 1.48;
        const radiusZ = ringFrac * 0.98;

        let x = radiusX * cosT;
        let z = radiusZ * sinT - 0.06;
        let y = -0.78;

        // Hemidiaphragm peaks
        if (ringFrac < 0.85) {
          const domeInfluence = Math.sin(ringFrac * Math.PI);
          if (x > 0.05) {
            const rightFactor = Math.min(1.0, Math.max(0, (x - 0.05) / 0.65));
            y += domeInfluence * (0.14 * rightFactor);
          } else if (x < -0.05) {
            const leftFactor = Math.min(1.0, Math.max(0, (-x - 0.05) / 0.65));
            y += domeInfluence * (0.07 * leftFactor);
          }
        }

        // Peripheral attachments
        if (ringFrac > 0.65) {
          const edgeSlope = (ringFrac - 0.65) / 0.35;
          if (sinT < -0.2) {
            y -= edgeSlope * 0.45 * Math.abs(sinT);
          } else if (sinT > 0.4) {
            y += edgeSlope * 0.28 * sinT;
          } else {
            y -= edgeSlope * 0.16;
          }
        }

        positions.push(x, y, z);
        uvs.push((cosT + 1) * 0.5, (sinT + 1) * 0.5);
      }
    }

    for (let rIdx = 0; rIdx < ringSegs; rIdx++) {
      for (let sIdx = 0; sIdx < radialSegs; sIdx++) {
        const a = rIdx * (radialSegs + 1) + sIdx;
        const b = (rIdx + 1) * (radialSegs + 1) + sIdx;
        const c = (rIdx + 1) * (radialSegs + 1) + (sIdx + 1);
        const d = rIdx * (radialSegs + 1) + (sIdx + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Diaphragm subtle respiratory excursion animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const breathCycle = Math.sin(time * 1.45);
    if (diaphragmRef.current) {
      diaphragmRef.current.position.y = -breathCycle * 0.012;
    }
  });

  // =========================================================================
  // 3. SYSTEMIC ARTERIAL VASCULAR TREE (Crimson Red #dc2626 / #ef4444)
  // Thick Ascending Aorta & Arch, Common Carotids, Subclavians & Brachials,
  // Descending Thoracic Aorta, Internal Thoracic, Pectoral & Intercostal Trees
  // =========================================================================
  const arterialGeos = useMemo(() => {
    // 1. Thick Ascending Aorta & Complete Aortic Arch (aligned with left-shifted heart)
    const aortaArch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 0.48, 0.18),
      new THREE.Vector3(-0.13, 0.85, 0.16),
      new THREE.Vector3(-0.16, 1.15, 0.06),
      new THREE.Vector3(-0.24, 1.25, -0.08),
      new THREE.Vector3(-0.34, 1.08, -0.22),
      new THREE.Vector3(-0.37, 0.65, -0.30),
    ]);

    // 2. Descending Thoracic & Abdominal Aorta
    const descendingAorta = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.37, 0.65, -0.30),
      new THREE.Vector3(-0.28, 0.15, -0.32),
      new THREE.Vector3(-0.20, -0.35, -0.31),
      new THREE.Vector3(-0.12, -0.85, -0.29),
      new THREE.Vector3(-0.06, -1.35, -0.27),
      new THREE.Vector3(0.00, -1.85, -0.25),
    ]);

    // Abdominal Aortic Bifurcation (Common Iliac Arteries)
    const rightIliac = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, -1.85, -0.25),
      new THREE.Vector3(0.12, -2.00, -0.23),
      new THREE.Vector3(0.25, -2.18, -0.20),
    ]);
    const leftIliac = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, -1.85, -0.25),
      new THREE.Vector3(-0.12, -2.00, -0.23),
      new THREE.Vector3(-0.25, -2.18, -0.20),
    ]);

    // 3. Right Common Carotid Artery (Ascending through right neck)
    const rightCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, 1.35, 0.10),
      new THREE.Vector3(0.18, 1.70, 0.12),
      new THREE.Vector3(0.20, 2.05, 0.12),
      new THREE.Vector3(0.22, 2.25, 0.10),
    ]);
    // Right Internal & External Carotid Bifurcations & Superior Thyroid Branch
    const rightInternalCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.20, 2.05, 0.12),
      new THREE.Vector3(0.16, 2.28, 0.06),
    ]);
    const rightExternalCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.20, 2.05, 0.12),
      new THREE.Vector3(0.26, 2.28, 0.13),
    ]);
    const rightThyroidArtery = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 1.70, 0.12),
      new THREE.Vector3(0.10, 1.55, 0.18),
      new THREE.Vector3(0.05, 1.48, 0.20),
    ]);

    // 4. Left Common Carotid Artery (Ascending through left neck)
    const leftCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 1.35, 0.02),
      new THREE.Vector3(-0.10, 1.70, 0.08),
      new THREE.Vector3(-0.14, 2.05, 0.10),
      new THREE.Vector3(-0.16, 2.25, 0.08),
    ]);
    const leftInternalCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 2.05, 0.10),
      new THREE.Vector3(-0.12, 2.28, 0.06),
    ]);
    const leftExternalCarotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 2.05, 0.10),
      new THREE.Vector3(-0.20, 2.28, 0.13),
    ]);
    const leftThyroidArtery = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.10, 1.70, 0.08),
      new THREE.Vector3(-0.04, 1.55, 0.18),
      new THREE.Vector3(-0.01, 1.48, 0.20),
    ]);

    // 5. Right Subclavian, Axillary & Brachial Artery (Arching over shoulder down arm)
    const rightBrachial = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, 1.38, 0.10),
      new THREE.Vector3(0.75, 1.28, 0.22),
      new THREE.Vector3(1.55, 1.12, 0.18),
      new THREE.Vector3(2.18, 0.82, 0.10),
      new THREE.Vector3(2.36, 0.15, 0.04),
      new THREE.Vector3(2.40, -0.65, -0.01),
      new THREE.Vector3(2.34, -1.45, -0.04),
      new THREE.Vector3(2.30, -1.90, -0.06),
    ]);
    // Right Profunda Brachii (Deep Brachial Artery)
    const rightProfundaBrachii = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.36, 0.15, 0.04),
      new THREE.Vector3(2.46, -0.25, -0.08),
      new THREE.Vector3(2.44, -1.05, -0.10),
    ]);

    // 6. Left Subclavian, Axillary & Brachial Artery (Arching over shoulder down arm)
    const leftBrachial = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.10, 1.38, -0.06),
      new THREE.Vector3(-0.75, 1.28, 0.22),
      new THREE.Vector3(-1.55, 1.12, 0.18),
      new THREE.Vector3(-2.18, 0.82, 0.10),
      new THREE.Vector3(-2.36, 0.15, 0.04),
      new THREE.Vector3(-2.40, -0.65, -0.01),
      new THREE.Vector3(-2.34, -1.45, -0.04),
      new THREE.Vector3(-2.30, -1.90, -0.06),
    ]);
    // Left Profunda Brachii
    const leftProfundaBrachii = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.36, 0.15, 0.04),
      new THREE.Vector3(-2.46, -0.25, -0.08),
      new THREE.Vector3(-2.44, -1.05, -0.10),
    ]);

    // 7. Internal Thoracic (Mammary) Arteries (Descending along sternal borders)
    const rightInternalThoracic = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.42, 1.20, 0.22),
      new THREE.Vector3(0.34, 0.75, 0.54),
      new THREE.Vector3(0.30, 0.25, 0.60),
      new THREE.Vector3(0.28, -0.25, 0.58),
      new THREE.Vector3(0.26, -0.75, 0.52),
    ]);
    const leftInternalThoracic = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 1.20, 0.22),
      new THREE.Vector3(-0.34, 0.75, 0.54),
      new THREE.Vector3(-0.30, 0.25, 0.60),
      new THREE.Vector3(-0.28, -0.25, 0.58),
      new THREE.Vector3(-0.26, -0.75, 0.52),
    ]);

    // 8. Pectoral & Thoracoacromial Arterial Tree (Fanning across upper anterior chest wall)
    const pectoralBranches: THREE.TubeGeometry[] = [];
    // Right pectoral tree
    const rPec1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.45, 1.05, 0.18),
      new THREE.Vector3(1.10, 0.70, 0.45),
      new THREE.Vector3(0.75, 0.40, 0.58),
      new THREE.Vector3(0.45, 0.20, 0.62),
    ]);
    const rPec2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.10, 0.70, 0.45),
      new THREE.Vector3(1.05, 0.35, 0.52),
      new THREE.Vector3(0.92, -0.05, 0.56),
    ]);
    const rLatThoracic = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.65, 0.85, 0.15),
      new THREE.Vector3(1.50, 0.35, 0.32),
      new THREE.Vector3(1.40, -0.15, 0.38),
      new THREE.Vector3(1.30, -0.65, 0.35),
    ]);
    // Left pectoral tree
    const lPec1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.45, 1.05, 0.18),
      new THREE.Vector3(-1.10, 0.70, 0.45),
      new THREE.Vector3(-0.75, 0.40, 0.58),
      new THREE.Vector3(-0.45, 0.20, 0.62),
    ]);
    const lPec2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.10, 0.70, 0.45),
      new THREE.Vector3(-1.05, 0.35, 0.52),
      new THREE.Vector3(-0.92, -0.05, 0.56),
    ]);
    const lLatThoracic = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.65, 0.85, 0.15),
      new THREE.Vector3(-1.50, 0.35, 0.32),
      new THREE.Vector3(-1.40, -0.15, 0.38),
      new THREE.Vector3(-1.30, -0.65, 0.35),
    ]);

    pectoralBranches.push(new THREE.TubeGeometry(rPec1, 22, 0.024, 8, false));
    pectoralBranches.push(new THREE.TubeGeometry(rPec2, 18, 0.018, 8, false));
    pectoralBranches.push(new THREE.TubeGeometry(rLatThoracic, 24, 0.024, 8, false));
    pectoralBranches.push(new THREE.TubeGeometry(lPec1, 22, 0.024, 8, false));
    pectoralBranches.push(new THREE.TubeGeometry(lPec2, 18, 0.018, 8, false));
    pectoralBranches.push(new THREE.TubeGeometry(lLatThoracic, 24, 0.024, 8, false));

    // 9. Symmetrical Intercostal Arteries spreading across chest & rib cage
    const intercostalCurves: THREE.TubeGeometry[] = [];
    const icLevels = [0.60, 0.40, 0.18, -0.05, -0.28, -0.52, -0.76];
    icLevels.forEach((y, idx) => {
      const radius = idx < 2 ? 0.020 : 0.016;
      // Right intercostal arch
      const rCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.06, y, -0.30),
        new THREE.Vector3(0.48, y - 0.03, -0.18),
        new THREE.Vector3(0.98, y - 0.07, 0.12),
        new THREE.Vector3(1.42, y - 0.12, 0.28),
        new THREE.Vector3(1.62, y - 0.16, 0.34),
      ]);
      // Left intercostal arch
      const lCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, y, -0.30),
        new THREE.Vector3(-0.52, y - 0.03, -0.18),
        new THREE.Vector3(-1.02, y - 0.07, 0.12),
        new THREE.Vector3(-1.45, y - 0.12, 0.28),
        new THREE.Vector3(-1.65, y - 0.16, 0.34),
      ]);
      intercostalCurves.push(new THREE.TubeGeometry(rCurve, 20, radius, 8, false));
      intercostalCurves.push(new THREE.TubeGeometry(lCurve, 20, radius, 8, false));
    });

    return {
      aortaArch: new THREE.TubeGeometry(aortaArch, 36, 0.155, 20, false),
      descendingAorta: new THREE.TubeGeometry(descendingAorta, 36, 0.095, 14, false),
      rightIliac: new THREE.TubeGeometry(rightIliac, 16, 0.055, 10, false),
      leftIliac: new THREE.TubeGeometry(leftIliac, 16, 0.055, 10, false),
      rightCarotid: new THREE.TubeGeometry(rightCarotid, 24, 0.046, 10, false),
      rightInternalCarotid: new THREE.TubeGeometry(rightInternalCarotid, 12, 0.032, 8, false),
      rightExternalCarotid: new THREE.TubeGeometry(rightExternalCarotid, 12, 0.034, 8, false),
      rightThyroidArtery: new THREE.TubeGeometry(rightThyroidArtery, 14, 0.020, 8, false),
      leftCarotid: new THREE.TubeGeometry(leftCarotid, 24, 0.044, 10, false),
      leftInternalCarotid: new THREE.TubeGeometry(leftInternalCarotid, 12, 0.032, 8, false),
      leftExternalCarotid: new THREE.TubeGeometry(leftExternalCarotid, 12, 0.034, 8, false),
      leftThyroidArtery: new THREE.TubeGeometry(leftThyroidArtery, 14, 0.020, 8, false),
      rightBrachial: new THREE.TubeGeometry(rightBrachial, 44, 0.048, 12, false),
      rightProfundaBrachii: new THREE.TubeGeometry(rightProfundaBrachii, 20, 0.026, 8, false),
      leftBrachial: new THREE.TubeGeometry(leftBrachial, 44, 0.046, 12, false),
      leftProfundaBrachii: new THREE.TubeGeometry(leftProfundaBrachii, 20, 0.026, 8, false),
      rightInternalThoracic: new THREE.TubeGeometry(rightInternalThoracic, 24, 0.025, 8, false),
      leftInternalThoracic: new THREE.TubeGeometry(leftInternalThoracic, 24, 0.025, 8, false),
      pectoralBranches,
      intercostals: intercostalCurves,
    };
  }, []);

  // =========================================================================
  // 4. SYSTEMIC VENOUS VASCULAR TREE (Cobalt Blue #2563eb / #1d4ed8)
  // Large SVC, Jugulars down neck, Subclavian & Brachial veins from arms into SVC, IVC
  // =========================================================================
  const venousGeos = useMemo(() => {
    // 1. Large Superior Vena Cava (SVC entering right atrium of left-shifted heart)
    const svc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.54, 1.35, -0.18),
      new THREE.Vector3(-0.55, 1.00, -0.22),
      new THREE.Vector3(-0.54, 0.55, -0.20),
    ]);

    // 2. Left Brachiocephalic (Innominate) Vein (sweeping across anterior to arch branches)
    const leftBrachiocephalicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.32, 1.48, 0.04),
      new THREE.Vector3(0.05, 1.40, 0.00),
      new THREE.Vector3(-0.25, 1.35, -0.10),
      new THREE.Vector3(-0.54, 1.35, -0.18),
    ]);

    // 3. Right Brachiocephalic Vein
    const rightBrachiocephalicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.50, 1.60, -0.06),
      new THREE.Vector3(-0.54, 1.35, -0.18),
    ]);

    // 4. Internal Jugular Veins (Neck into brachiocephalic veins)
    const rightInternalJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 2.20, 0.08),
      new THREE.Vector3(-0.38, 1.85, 0.06),
      new THREE.Vector3(-0.42, 1.60, -0.06),
    ]);
    const leftInternalJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.30, 2.20, 0.08),
      new THREE.Vector3(0.32, 1.85, 0.06),
      new THREE.Vector3(0.32, 1.48, 0.04),
    ]);

    // External Jugular Veins (Superficial lateral neck veins)
    const rightExternalJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.52, 2.05, 0.12),
      new THREE.Vector3(-0.62, 1.65, 0.15),
      new THREE.Vector3(-0.72, 1.30, 0.16),
    ]);
    const leftExternalJugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.52, 2.05, 0.12),
      new THREE.Vector3(0.60, 1.65, 0.15),
      new THREE.Vector3(0.70, 1.30, 0.16),
    ]);

    // 5. Right Subclavian, Axillary, Cephalic & Basilic Veins (From right arm into SVC)
    const rightArmVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.38, -1.90, 0.02),
      new THREE.Vector3(2.42, -1.15, 0.05),
      new THREE.Vector3(2.36, -0.20, 0.08),
      new THREE.Vector3(2.22, 0.65, 0.14),
      new THREE.Vector3(1.60, 0.98, 0.20),
      new THREE.Vector3(0.75, 1.15, 0.18),
      new THREE.Vector3(-0.42, 1.30, -0.12),
    ]);
    const rightCephalicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.46, -1.85, 0.08),
      new THREE.Vector3(2.50, -1.00, 0.10),
      new THREE.Vector3(2.42, 0.15, 0.16),
      new THREE.Vector3(2.15, 0.88, 0.22),
      new THREE.Vector3(1.45, 1.08, 0.26),
      new THREE.Vector3(0.75, 1.15, 0.18),
    ]);

    // 6. Left Subclavian, Axillary, Cephalic & Basilic Veins (From left arm into SVC)
    const leftArmVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.38, -1.90, 0.02),
      new THREE.Vector3(-2.42, -1.15, 0.05),
      new THREE.Vector3(-2.36, -0.20, 0.08),
      new THREE.Vector3(-2.22, 0.65, 0.14),
      new THREE.Vector3(-1.60, 0.98, 0.20),
      new THREE.Vector3(-0.75, 1.15, 0.18),
      new THREE.Vector3(0.28, 1.35, -0.06),
    ]);
    const leftCephalicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.46, -1.85, 0.08),
      new THREE.Vector3(-2.50, -1.00, 0.10),
      new THREE.Vector3(-2.42, 0.15, 0.16),
      new THREE.Vector3(-2.15, 0.88, 0.22),
      new THREE.Vector3(-1.45, 1.08, 0.26),
      new THREE.Vector3(-0.75, 1.15, 0.18),
    ]);

    // 7. Inferior Vena Cava (Abdomen into right atrium)
    const ivc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -1.85, -0.22),
      new THREE.Vector3(-0.38, -1.15, -0.24),
      new THREE.Vector3(-0.42, -0.45, -0.25),
      new THREE.Vector3(-0.44, 0.40, -0.24),
    ]);
    const rightCommonIliacVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -1.85, -0.22),
      new THREE.Vector3(-0.20, -2.00, -0.20),
      new THREE.Vector3(-0.10, -2.18, -0.18),
    ]);
    const leftCommonIliacVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -1.85, -0.22),
      new THREE.Vector3(-0.45, -2.00, -0.20),
      new THREE.Vector3(-0.55, -2.18, -0.18),
    ]);

    // 8. Thoracic Wall Venous Network (Internal thoracic & lateral veins)
    const rightInternalThoracicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.38, 1.15, 0.20),
      new THREE.Vector3(0.32, 0.65, 0.52),
      new THREE.Vector3(0.30, 0.05, 0.56),
      new THREE.Vector3(0.28, -0.55, 0.50),
    ]);
    const leftInternalThoracicVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 1.15, 0.20),
      new THREE.Vector3(-0.32, 0.65, 0.52),
      new THREE.Vector3(-0.30, 0.05, 0.56),
      new THREE.Vector3(-0.28, -0.55, 0.50),
    ]);

    return {
      svc: new THREE.TubeGeometry(svc, 24, 0.095, 14, false),
      leftBrachiocephalicVein: new THREE.TubeGeometry(leftBrachiocephalicVein, 24, 0.068, 12, false),
      rightBrachiocephalicVein: new THREE.TubeGeometry(rightBrachiocephalicVein, 16, 0.065, 10, false),
      rightInternalJugular: new THREE.TubeGeometry(rightInternalJugular, 20, 0.056, 10, false),
      leftInternalJugular: new THREE.TubeGeometry(leftInternalJugular, 20, 0.054, 10, false),
      rightExternalJugular: new THREE.TubeGeometry(rightExternalJugular, 18, 0.035, 8, false),
      leftExternalJugular: new THREE.TubeGeometry(leftExternalJugular, 18, 0.035, 8, false),
      rightArmVein: new THREE.TubeGeometry(rightArmVein, 44, 0.052, 12, false),
      rightCephalicVein: new THREE.TubeGeometry(rightCephalicVein, 36, 0.034, 10, false),
      leftArmVein: new THREE.TubeGeometry(leftArmVein, 44, 0.050, 12, false),
      leftCephalicVein: new THREE.TubeGeometry(leftCephalicVein, 36, 0.034, 10, false),
      ivc: new THREE.TubeGeometry(ivc, 28, 0.088, 12, false),
      rightCommonIliacVein: new THREE.TubeGeometry(rightCommonIliacVein, 14, 0.052, 8, false),
      leftCommonIliacVein: new THREE.TubeGeometry(leftCommonIliacVein, 14, 0.052, 8, false),
      rightInternalThoracicVein: new THREE.TubeGeometry(rightInternalThoracicVein, 20, 0.024, 8, false),
      leftInternalThoracicVein: new THREE.TubeGeometry(leftInternalThoracicVein, 20, 0.024, 8, false),
    };
  }, []);

  // =========================================================================
  // 5. MATERIALS WITH CLIPPING PLANES & depthWrite: false CONTRACT
  // =========================================================================

  // Outer Thoracic Shell Material
  // Holographic Translucent Sapphire/Obsidian-Blue with Cyan Fresnel Edge Glow
  const shellMaterial = useMemo(() => {
    const isSkin = renderingMode === 'medical_skin';
    const mat = new THREE.MeshPhysicalMaterial({
      color: isSkin ? '#e4b69d' : '#0b1c36', // Warm medical skin or Obsidian sapphire blue (#0b1c36)
      roughness: isSkin ? 0.42 : 0.22,
      metalness: isSkin ? 0.02 : 0.10,
      transmission: isSkin ? 0.0 : 0.82,
      ior: 1.35,
      thickness: 0.8,
      clearcoat: isSkin ? 0.35 : 1.0,
      clearcoatRoughness: isSkin ? 0.22 : 0.14,
      transparent: true,
      opacity: isSkin ? 0.18 : 0.78,
      depthWrite: false, // Critical contract: NEVER occlude internal heart/vessels!
      side: THREE.DoubleSide,
      flatShading: false,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
    });

    if (!isSkin) {
      mat.customProgramCacheKey = () => 'torso_holographic_sapphire_fresnel';
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          vec3 rimViewDir = normalize(vViewPosition);
          vec3 rimNormal = normalize(vNormal);
          float rimFactor = 1.0 - clamp(abs(dot(rimNormal, rimViewDir)), 0.0, 1.0);
          rimFactor = pow(rimFactor, 2.4);
          // High-impact cyan Fresnel edge glow (#00e5ff)
          gl_FragColor.rgb += vec3(0.0, 0.85, 1.0) * (rimFactor * 0.92);
          `
        );
      };
    }

    return mat;
  }, [renderingMode, clippingPlane]);

  // Diaphragm Muscle Material
  const diaphragmMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#822e3e', // Deep diaphragmatic muscular tone
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.35,
      clearcoatRoughness: 0.20,
      transparent: true,
      opacity: 0.32,
      depthWrite: false, // Prevents alpha occlusion of heart apex
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // High-Impact Systemic Arterial Material (Crimson Red #dc2626, clearcoat: 1.0, roughness: 0.18)
  const systemicArteryMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#dc2626', // Vibrant systemic arterial crimson red
      roughness: 0.18,
      metalness: 0.10,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // High-Impact Systemic Venous Material (Cobalt Blue #2563eb, clearcoat: 0.90, roughness: 0.20)
  const systemicVenousMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#2563eb', // Vibrant systemic venous cobalt blue
      roughness: 0.20,
      metalness: 0.10,
      clearcoat: 0.90,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // Edge line material with clipping support
  const edgeLineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
    });
  }, [clippingPlane]);

  if (!showTorso) {
    return null;
  }

  return (
    <group name="TorsoAnatomicalSystem" position={[0, -0.05, 0]}>
      {/* ============================================================== */}
      {/* 1. SKELETAL RIB CAGE & THORACIC SPINE                         */}
      {/* ============================================================== */}
      {showRibs && <RibCage />}

      {/* ============================================================== */}
      {/* 2. PULMONARY LUNGS (Bilobed Left w/ Cardiac Notch, Trilobed Right) */}
      {/* ============================================================== */}
      {showLungs && <Lungs />}

      {/* ============================================================== */}
      {/* 3. DOME-SHAPED DIAPHRAGM MUSCLE                                */}
      {/* ============================================================== */}
      {showDiaphragm && (
        <mesh
          ref={diaphragmRef}
          geometry={diaphragmGeo}
          material={diaphragmMaterial}
          castShadow={false}
          receiveShadow={false}
        />
      )}

      {/* ============================================================== */}
      {/* 4. TRANSLUCENT OUTER THORACIC SHELL & ARMS                    */}
      {/* ============================================================== */}
      <mesh geometry={torsoGeo} material={shellMaterial} castShadow={false} receiveShadow={false} />
      <mesh geometry={armGeos.left} material={shellMaterial} />
      <mesh geometry={armGeos.right} material={shellMaterial} />

      {/* Subtle Holographic Edge Rings (when in holographic styling) */}
      {renderingMode !== 'medical_skin' && (
        <lineSegments geometry={edgesGeo} material={edgeLineMaterial} />
      )}

      {/* ============================================================== */}
      {/* 5. SYSTEMIC ARTERIAL TREE (Crimson Red #dc2626)               */}
      {/* Thick Ascending Aorta & Arch, Carotids, Subclavians/Brachials */}
      {/* ============================================================== */}
      {showVasculature && (
        <>
          {/* Thick Ascending Aorta & Arch */}
          <mesh geometry={arterialGeos.aortaArch} material={systemicArteryMaterial} />
          {/* Descending Thoracic & Abdominal Aorta */}
          <mesh geometry={arterialGeos.descendingAorta} material={systemicArteryMaterial} />
          <mesh geometry={arterialGeos.rightIliac} material={systemicArteryMaterial} />
          <mesh geometry={arterialGeos.leftIliac} material={systemicArteryMaterial} />

          {/* Primary Common Carotid Arteries Ascending Through Neck */}
          <mesh geometry={arterialGeos.rightCarotid} material={systemicArteryMaterial} />
          <mesh geometry={arterialGeos.leftCarotid} material={systemicArteryMaterial} />

          {/* Primary Subclavian & Brachial Arteries Arching into Both Arms */}
          <mesh geometry={arterialGeos.rightBrachial} material={systemicArteryMaterial} />
          <mesh geometry={arterialGeos.leftBrachial} material={systemicArteryMaterial} />

          {/* ============================================================== */}
          {/* 6. SYSTEMIC VENOUS TREE (Cobalt Blue #2563eb)                 */}
          {/* Large SVC, Primary Jugulars, Brachiocephalics, Main Arm Veins */}
          {/* ============================================================== */}
          {/* Large Superior Vena Cava (SVC) Entering Heart */}
          <mesh geometry={venousGeos.svc} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.leftBrachiocephalicVein} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.rightBrachiocephalicVein} material={systemicVenousMaterial} />

          {/* Primary Internal Jugular Veins Descending From Neck */}
          <mesh geometry={venousGeos.rightInternalJugular} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.leftInternalJugular} material={systemicVenousMaterial} />

          {/* Primary Subclavian & Brachial Veins in Both Arms */}
          <mesh geometry={venousGeos.rightArmVein} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.leftArmVein} material={systemicVenousMaterial} />

          {/* Inferior Vena Cava (IVC) & Iliac Veins */}
          <mesh geometry={venousGeos.ivc} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.rightCommonIliacVein} material={systemicVenousMaterial} />
          <mesh geometry={venousGeos.leftCommonIliacVein} material={systemicVenousMaterial} />
        </>
      )}
    </group>
  );
};
