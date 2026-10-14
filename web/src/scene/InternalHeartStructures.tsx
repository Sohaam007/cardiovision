import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { INTERNAL_HEART_STRUCTURES } from '../data/heartAnatomyData';
import { getVesselColorThree } from './vesselConfig';
import { computeCardiacMotion } from './cardiacMotion';

interface PinProps {
  id: string;
  name: string;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const AnatomicalPin: React.FC<PinProps> = ({ id, name, position, isSelected, onSelect }) => {
  return (
    <group name={`Pin_${name}`} position={position}>
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.065, 0.088, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.88} />
        </mesh>
      )}

      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[isSelected ? 0.048 : 0.034, 18, 18]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#fb7185'}
          emissive={isSelected ? '#0284c7' : '#e11d48'}
          emissiveIntensity={isSelected ? 0.90 : 0.45}
          roughness={0.20}
          metalness={0.10}
        />
      </mesh>

      <mesh position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.004, 0.002, 0.07, 10]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.18} />
      </mesh>
    </group>
  );
};

/**
 * Creates silky, velvety 1024x1024 procedural spongy myocardium cut-surface texture.
 * Replaces noisy stipple dots with clean, elegant histological myofiber grain:
 * - Rich fleshy pink-coral myocardium tone (#c24153 to #be384d)
 * - Concentric myofiber striations around thick LV free wall
 * - Longitudinal myofiber sweeps down RV wall and central IVS
 * - Pearlescent endocardial sheen lining inner cavity rims
 * - Soft subepicardial coral-crimson depth gradient
 */
function createCleanMyocardiumCutTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base fleshy cut muscle coral-crimson radial gradient
  const baseGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 580);
  baseGrad.addColorStop(0.0, '#c24153');
  baseGrad.addColorStop(0.55, '#be384d');
  baseGrad.addColorStop(1.0, '#9c1c2e');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric helical muscle fiber striations (LV side: x > 512)
  ctx.save();
  for (let r = 60; r < 520; r += 7) {
    const alpha = 0.06 + Math.random() * 0.10;
    ctx.strokeStyle = Math.random() > 0.4 ? `rgba(255, 185, 195, ${alpha})` : `rgba(110, 16, 28, ${alpha * 1.2})`;
    ctx.lineWidth = 1.4 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.arc(720, 560, r + (Math.random() - 0.5) * 4, -Math.PI * 0.8, Math.PI * 0.8);
    ctx.stroke();
  }
  ctx.restore();

  // Longitudinal & transverse myofiber sweeps (RV side: x < 512)
  ctx.save();
  for (let y = 0; y < 1024; y += 9) {
    const alpha = 0.06 + Math.random() * 0.10;
    ctx.strokeStyle = Math.random() > 0.4 ? `rgba(255, 180, 190, ${alpha})` : `rgba(100, 14, 26, ${alpha * 1.2})`;
    ctx.lineWidth = 1.4 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(40, y + (Math.random() - 0.5) * 6);
    ctx.quadraticCurveTo(280, y + (Math.random() - 0.5) * 12, 530, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  ctx.restore();

  // Fine lamellar myofiber cleavage lines
  ctx.save();
  ctx.strokeStyle = 'rgba(80, 10, 22, 0.25)';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 90; i++) {
    const startX = Math.random() * 1024;
    const startY = Math.random() * 1024;
    const len = 25 + Math.random() * 45;
    const angle = (Math.random() - 0.5) * Math.PI * 0.7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * len, startY + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();

  // Pearlescent inner cavity margin sheen
  ctx.save();
  ctx.fillStyle = 'rgba(255, 235, 240, 0.05)';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Creates authentic semilunar pocket cusps for aortic & pulmonary valves.
 * Features curved crescentic nest pocket geometry with nodule of Arantius at free margin center.
 */
function createSemilunarPocketCuspGeometry(radius = 0.080, depth = 0.045, angleSpan = (Math.PI * 2) / 3) {
  const shape = new THREE.Shape();
  const segments = 24;
  const halfSpan = angleSpan / 2;

  shape.moveTo(Math.sin(-halfSpan) * radius, Math.cos(-halfSpan) * radius);
  for (let i = -segments / 2; i <= segments / 2; i++) {
    const a = (i / (segments / 2)) * halfSpan;
    // Central thickening for Nodule of Arantius
    const nodule = Math.cos(a / halfSpan * (Math.PI / 2)) * 0.012;
    const r = radius + nodule;
    shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  // Coaptation base curve
  shape.quadraticCurveTo(0, radius * 0.25, Math.sin(-halfSpan) * radius, Math.cos(-halfSpan) * radius);

  const extrudeSettings = {
    depth: 0.006,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.002,
    bevelThickness: 0.002,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const pos = geo.attributes.position;
  // Cup the cusp into a 3D semilunar pocket
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const distFromOrigin = Math.sqrt(x * x + y * y) / radius;
    const cupZ = Math.sin(Math.min(1, distFromOrigin) * Math.PI) * depth;
    pos.setZ(i, pos.getZ(i) - cupZ);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates anatomically authentic bicuspid mitral and tricuspid valve leaflets with scallops & clefts.
 */
function createAnatomicalLeafletGeometry(
  width = 0.26,
  height = 0.20,
  scallops = 3,
  bellyCurvature = 0.045
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, -height * 0.25);

  const step = width / scallops;
  for (let i = scallops - 1; i >= 0; i--) {
    const xRight = -width / 2 + (i + 1) * step;
    const xMid = -width / 2 + (i + 0.5) * step;
    const xLeft = -width / 2 + i * step;

    // Scalloped lobe curve with distinct inter-scallop cleft
    const lobeDepth = height * (0.85 + (i === 1 ? 0.15 : 0.05));
    shape.bezierCurveTo(
      xRight - step * 0.15, -height * 0.45,
      xMid + step * 0.25, -lobeDepth,
      xMid, -lobeDepth
    );
    shape.bezierCurveTo(
      xMid - step * 0.25, -lobeDepth,
      xLeft + step * 0.15, -height * 0.45,
      xLeft, -height * 0.25
    );
  }

  shape.lineTo(-width / 2, 0);

  const extrudeSettings = {
    depth: 0.007,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0025,
    bevelThickness: 0.0025,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const pos = geo.attributes.position;
  // Belly curvature: leaflets bow outward under intraventricular pressure
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const normX = Math.min(1, Math.abs(x) / (width / 2));
    const normY = Math.min(1, Math.abs(y) / height);
    const bow = Math.sin(normY * Math.PI) * (1 - normX * 0.6) * bellyCurvature;
    pos.setZ(i, pos.getZ(i) - bow);
  }
  geo.computeVertexNormals();
  return geo;
}

export const InternalHeartStructures: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const cutDepth = useStore((state) => state.cutDepth);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const selectedStructure = useStore((state) => state.selectedInternalStructure);
  const setSelectedStructure = useStore((state) => state.setSelectedInternalStructure);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const ladProb = useStore((state) => state.prediction.vessels.LAD?.prob ?? 0.5);
  const lcxProb = useStore((state) => state.prediction.vessels.LCX?.prob ?? 0.5);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const hoveredVessel = useStore((state) => state.hoveredVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setHoveredVessel = useStore((state) => state.setHoveredVessel);

  // Dynamic 60 FPS Biomechanics refs
  const mitralAntLeafletRef = useRef<THREE.Mesh>(null);
  const mitralPostLeafletRef = useRef<THREE.Mesh>(null);
  const tricuspidAntRef = useRef<THREE.Mesh>(null);
  const tricuspidPostRef = useRef<THREE.Mesh>(null);
  const tricuspidSeptalRef = useRef<THREE.Mesh>(null);
  const aorticValveRootRef = useRef<THREE.Group>(null);
  const aorticCuspRef1 = useRef<THREE.Mesh>(null);
  const aorticCuspRef2 = useRef<THREE.Mesh>(null);
  const aorticCuspRef3 = useRef<THREE.Mesh>(null);
  const pulmonaryValveRootRef = useRef<THREE.Group>(null);
  const pulmonaryCuspRef1 = useRef<THREE.Mesh>(null);
  const pulmonaryCuspRef2 = useRef<THREE.Mesh>(null);
  const pulmonaryCuspRef3 = useRef<THREE.Mesh>(null);
  const lvPapillaryAnteroRef = useRef<THREE.Mesh>(null);
  const lvPapillaryPosteroRef = useRef<THREE.Mesh>(null);
  const rvPapillaryAnteroRef = useRef<THREE.Mesh>(null);
  const chordaeGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const { isBeating, heartRateBpm, beatingSpeed } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    // 1. Mitral Valve Leaflet Biomechanics
    if (mitralAntLeafletRef.current) {
      mitralAntLeafletRef.current.rotation.x = motion.avValveOpen * 0.52;
      mitralAntLeafletRef.current.position.z = motion.avValveOpen * 0.025;
    }
    if (mitralPostLeafletRef.current) {
      mitralPostLeafletRef.current.rotation.x = Math.PI - motion.avValveOpen * 0.44;
      mitralPostLeafletRef.current.position.z = -motion.avValveOpen * 0.020;
    }

    // 2. Tricuspid Valve Leaflet Biomechanics
    if (tricuspidAntRef.current) {
      tricuspidAntRef.current.rotation.x = motion.avValveOpen * 0.46;
    }
    if (tricuspidPostRef.current) {
      tricuspidPostRef.current.rotation.x = Math.PI - motion.avValveOpen * 0.38;
    }
    if (tricuspidSeptalRef.current) {
      tricuspidSeptalRef.current.rotation.z = -motion.avValveOpen * 0.32;
    }

    // 3. Aortic Semilunar Valve Biomechanics (Synchronized with rapid/reduced ejection)
    if (aorticValveRootRef.current) {
      const open = motion.semilunarValveOpen;
      if (aorticCuspRef1.current) aorticCuspRef1.current.rotation.x = 0.28 - open * 0.48;
      if (aorticCuspRef2.current) aorticCuspRef2.current.rotation.x = 0.28 - open * 0.48;
      if (aorticCuspRef3.current) aorticCuspRef3.current.rotation.x = 0.28 - open * 0.48;
    }

    // 4. Pulmonary Semilunar Valve Biomechanics (Synchronized with rapid/reduced ejection)
    if (pulmonaryValveRootRef.current) {
      const pOpen = motion.semilunarValveOpen;
      if (pulmonaryCuspRef1.current) pulmonaryCuspRef1.current.rotation.x = 0.26 - pOpen * 0.45;
      if (pulmonaryCuspRef2.current) pulmonaryCuspRef2.current.rotation.x = 0.26 - pOpen * 0.45;
      if (pulmonaryCuspRef3.current) pulmonaryCuspRef3.current.rotation.x = 0.26 - pOpen * 0.45;
    }

    // 5. Papillary Muscles Synchronous Contraction
    const papillaryTensionScale = 1.0 - motion.contraction * 0.14;
    const papillaryRadialScale = 1.0 + motion.contraction * 0.08;
    if (lvPapillaryAnteroRef.current) {
      lvPapillaryAnteroRef.current.scale.set(papillaryRadialScale, papillaryTensionScale, papillaryRadialScale);
    }
    if (lvPapillaryPosteroRef.current) {
      lvPapillaryPosteroRef.current.scale.set(papillaryRadialScale, papillaryTensionScale, papillaryRadialScale);
    }
    if (rvPapillaryAnteroRef.current) {
      rvPapillaryAnteroRef.current.scale.set(papillaryRadialScale, papillaryTensionScale, papillaryRadialScale);
    }

    // 6. Chordae Tendineae Taut Tension
    if (chordaeGroupRef.current) {
      chordaeGroupRef.current.position.y = -motion.contraction * 0.015;
    }
  });

  // Cut offset & orientation synchronization with store cutDepth & dissectionPlane
  const { cutZ, groupRotation, groupPosition } = useMemo(() => {
    const zOffset = 0.52 - cutDepth * 0.92;
    if (dissectionPlane === 'coronal') {
      return {
        cutZ: zOffset,
        groupRotation: [0, 0, 0] as [number, number, number],
        groupPosition: [0, 0, 0] as [number, number, number],
      };
    } else if (dissectionPlane === 'short_axis') {
      const yOffset = 0.45 - cutDepth * 1.05;
      return {
        cutZ: yOffset,
        groupRotation: [Math.PI / 2, 0, 0] as [number, number, number],
        groupPosition: [0, yOffset - zOffset, 0] as [number, number, number],
      };
    } else {
      const xOffset = 0.40 - cutDepth * 0.85;
      return {
        cutZ: xOffset,
        groupRotation: [0, Math.PI / 2, 0] as [number, number, number],
        groupPosition: [xOffset - zOffset, 0, 0] as [number, number, number],
      };
    }
  }, [cutDepth, dissectionPlane]);

  const myocardiumTex = useMemo(() => createCleanMyocardiumCutTexture(), []);

  // LAD Artery Color: Vibrant scarlet red matching reference 3 (#dc2626) with prediction blending
  const ladColor = useMemo(() => {
    const baseColor = getVesselColorThree(ladProb, colorblindMode);
    return baseColor || '#dc2626';
  }, [ladProb, colorblindMode]);

  const lcxColor = useMemo(() => getVesselColorThree(lcxProb, colorblindMode), [lcxProb, colorblindMode]);

  // =========================================================================
  // 1. SOLID, CLEAN CORONAL CUT-FACE WALL CAP (Matching Reference Image 3)
  // Single contiguous, beveled cut slab:
  // - Thick Left Ventricular wall (~12-14mm scale) on viewer's right
  // - Distinct Right Ventricular wall on viewer's left
  // - Solid muscular Interventricular Septum (IVS) down the center
  // - NO chaotic atrial holes or swiss-cheese windows!
  // =========================================================================
  const cutCapGeo = useMemo(() => {
    const shape = new THREE.Shape();

    // Outer myocardial silhouette envelope
    shape.moveTo(0.00, -1.08); // Apex
    shape.bezierCurveTo(0.26, -1.04, 0.48, -0.86, 0.62, -0.62);
    shape.bezierCurveTo(0.70, -0.32, 0.68, 0.06, 0.52, 0.30); // LV lateral base
    shape.bezierCurveTo(0.38, 0.36, 0.12, 0.35, -0.10, 0.32); // Basal crest across IVS
    shape.bezierCurveTo(-0.35, 0.30, -0.56, 0.20, -0.68, 0.04); // RV outflow transition
    shape.bezierCurveTo(-0.78, -0.20, -0.74, -0.55, -0.62, -0.80); // RV free wall
    shape.bezierCurveTo(-0.48, -0.98, -0.24, -1.05, 0.00, -1.08); // Return to apex

    // HOLE 1: LEFT VENTRICLE CAVITY (Viewer's right / anatomical left)
    // Thick muscular wall: ~0.18-0.22 units thick lateral wall and dense apical musculature
    const lvHole = new THREE.Path();
    lvHole.moveTo(0.12, 0.20);
    lvHole.bezierCurveTo(0.28, 0.18, 0.42, 0.08, 0.44, -0.16);
    lvHole.bezierCurveTo(0.44, -0.48, 0.36, -0.70, 0.20, -0.74);
    lvHole.bezierCurveTo(0.10, -0.72, 0.08, -0.35, 0.08, -0.05); // Clean IVS margin
    lvHole.lineTo(0.12, 0.20);
    shape.holes.push(lvHole);

    // HOLE 2: RIGHT VENTRICLE CAVITY (Viewer's left / anatomical right)
    // Thinner crescent muscular wall: ~0.10-0.12 units thick
    const rvHole = new THREE.Path();
    rvHole.moveTo(-0.10, 0.18);
    rvHole.bezierCurveTo(-0.32, 0.16, -0.52, 0.06, -0.62, -0.16);
    rvHole.bezierCurveTo(-0.62, -0.50, -0.52, -0.68, -0.32, -0.72);
    rvHole.bezierCurveTo(-0.18, -0.70, -0.09, -0.35, -0.08, -0.05); // Wrapping around convex IVS
    rvHole.lineTo(-0.10, 0.18);
    shape.holes.push(rvHole);

    // Clean, beveled coronal cut extrusion
    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.022,
      bevelThickness: 0.022,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // =========================================================================
  // 2. DEEP CAVERNOUS CAVITY BACK-SHELLS (Smooth cinematic burgundy depth)
  // =========================================================================
  const lvCavityGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.38, 36, 26, 0, Math.PI, 0, Math.PI);
    geo.scale(0.86, 1.45, 0.75);
    return geo;
  }, []);

  const rvCavityGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.40, 36, 26, 0, Math.PI, 0, Math.PI);
    geo.scale(1.08, 1.36, 0.65);
    return geo;
  }, []);

  // =========================================================================
  // 3. PAPILLARY MUSCLES (Sculpted Muscular Pillars on Cavity Floor/Wall)
  // Clean, distinct conical pillars matching reference image 3
  // =========================================================================
  const papillaryGeos = useMemo(() => {
    return {
      lvAnterolateral: new THREE.ConeGeometry(0.066, 0.28, 20),
      lvPosteromedial: new THREE.ConeGeometry(0.060, 0.26, 20),
      rvAnterior: new THREE.ConeGeometry(0.062, 0.26, 18),
      rvSeptal: new THREE.ConeGeometry(0.038, 0.14, 14),
    };
  }, []);

  // Moderator Band: Muscular bridge crossing from lower IVS to RV anterior papillary muscle
  const moderatorBandGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.34, -0.02),
      new THREE.Vector3(-0.21, -0.37, 0.01),
      new THREE.Vector3(-0.33, -0.40, -0.01),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.024, 10, false);
  }, []);

  // =========================================================================
  // 4. MITRAL & TRICUSPID VALVES (Elegant Scalloped Leaflets)
  // =========================================================================
  const mitralAnnulusGeo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 0.16, 0.13, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(36).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const catmull = new THREE.CatmullRomCurve3(points, true);
    return new THREE.TubeGeometry(catmull, 36, 0.010, 8, true);
  }, []);

  const mitralAnteriorLeafletGeo = useMemo(() => {
    return createAnatomicalLeafletGeometry(0.24, 0.20, 1, 0.045);
  }, []);

  const mitralPosteriorLeafletGeo = useMemo(() => {
    return createAnatomicalLeafletGeometry(0.22, 0.17, 3, 0.035);
  }, []);

  const tricuspidAnnulusGeo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 0.15, 0.12, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(36).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const catmull = new THREE.CatmullRomCurve3(points, true);
    return new THREE.TubeGeometry(catmull, 36, 0.010, 8, true);
  }, []);

  const tricuspidLeafletGeos = useMemo(() => {
    return {
      anterior: createAnatomicalLeafletGeometry(0.20, 0.16, 1, 0.032),
      posterior: createAnatomicalLeafletGeometry(0.18, 0.14, 2, 0.028),
      septal: createAnatomicalLeafletGeometry(0.16, 0.13, 1, 0.024),
    };
  }, []);

  // =========================================================================
  // 5. ORDERLY, ELEGANT CHORDAE TENDINEAE FANS (Glistening White Fibrous Cords)
  // Clean suspension-bridge fans from papillary tips to leaflet free edges
  // Completely eliminated tangled clutter and chaotic crossing webs!
  // =========================================================================
  const chordaeGeometries = useMemo(() => {
    const chordRadius = 0.0042;
    const curves: THREE.CatmullRomCurve3[] = [
      // Fan A: LV Anterolateral Papillary tip (0.33, -0.27, -0.05) -> Anterior Mitral Leaflet
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, -0.26, -0.05),
        new THREE.Vector3(0.30, -0.10, -0.04),
        new THREE.Vector3(0.26, 0.03, -0.04),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, -0.26, -0.05),
        new THREE.Vector3(0.32, -0.09, -0.03),
        new THREE.Vector3(0.30, 0.02, -0.03),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, -0.26, -0.05),
        new THREE.Vector3(0.35, -0.09, -0.03),
        new THREE.Vector3(0.35, 0.02, -0.03),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, -0.26, -0.05),
        new THREE.Vector3(0.37, -0.10, -0.04),
        new THREE.Vector3(0.39, 0.03, -0.04),
      ]),

      // Fan B: LV Posteromedial Papillary tip (0.22, -0.34, -0.11) -> Posterior Mitral Leaflet
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, -0.33, -0.11),
        new THREE.Vector3(0.19, -0.14, -0.10),
        new THREE.Vector3(0.18, 0.03, -0.09),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, -0.33, -0.11),
        new THREE.Vector3(0.22, -0.14, -0.09),
        new THREE.Vector3(0.23, 0.02, -0.08),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, -0.33, -0.11),
        new THREE.Vector3(0.25, -0.14, -0.09),
        new THREE.Vector3(0.28, 0.02, -0.08),
      ]),

      // Fan C: RV Anterior Papillary tip (-0.34, -0.28, -0.05) -> Tricuspid Leaflets
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, -0.27, -0.05),
        new THREE.Vector3(-0.29, -0.11, -0.04),
        new THREE.Vector3(-0.25, 0.03, -0.03),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, -0.27, -0.05),
        new THREE.Vector3(-0.33, -0.10, -0.04),
        new THREE.Vector3(-0.31, 0.02, -0.03),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, -0.27, -0.05),
        new THREE.Vector3(-0.36, -0.11, -0.05),
        new THREE.Vector3(-0.37, 0.03, -0.05),
      ]),

      // Fan D: RV Septal Papillary tip (-0.12, -0.17, -0.03) -> Septal Leaflet
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.12, -0.16, -0.03),
        new THREE.Vector3(-0.14, -0.07, -0.03),
        new THREE.Vector3(-0.16, 0.03, -0.03),
      ]),
    ];

    return curves.map((curve) => new THREE.TubeGeometry(curve, 16, chordRadius, 8, false));
  }, []);

  // =========================================================================
  // 6. AORTIC VALVE & SINUSES OF VALSALVA (LV Outflow Tract)
  // =========================================================================
  const aorticValveGeos = useMemo(() => {
    const rootSinusesGeo = new THREE.CylinderGeometry(0.125, 0.115, 0.16, 24, 1, true);
    const cuspGeo = createSemilunarPocketCuspGeometry(0.080, 0.045, (Math.PI * 2) / 3);
    const ostiumGeo = new THREE.TorusGeometry(0.016, 0.004, 10, 20);
    return { rootSinusesGeo, cuspGeo, ostiumGeo };
  }, []);

  // =========================================================================
  // 7. PULMONARY VALVE & INFUNDIBULAR OUTFLOW TRACT (RVOT)
  // Hollow lumen opening atop cutaway matching reference image 3
  // =========================================================================
  const pulmonaryValveGeos = useMemo(() => {
    const infundibulumGeo = new THREE.CylinderGeometry(0.115, 0.120, 0.14, 24, 1, true);
    const cuspGeo = createSemilunarPocketCuspGeometry(0.074, 0.040, (Math.PI * 2) / 3);
    const lumenRing = new THREE.RingGeometry(0.085, 0.115, 24);
    const lumenCap = new THREE.CircleGeometry(0.085, 24);
    return { infundibulumGeo, cuspGeo, lumenRing, lumenCap };
  }, []);

  // =========================================================================
  // 8. BRIGHT SCARLET RED LAD ARTERY RUNNING OVER CUT SEPTAL CREST
  // Matches Reference Image 3 signature appearance:
  // - Scarlet red LAD (#dc2626) running along the anterior septal crest
  // - Diagonal branches D1 and D2 branching gracefully down toward apex
  // - Slender LCX marginal branch along the LV lateral cut border
  // =========================================================================
  const coronaryVesselGeos = useMemo(() => {
    // Main LAD Trunk along Anterior Interventricular Groove over cut crest
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 0.28, 0.015),
      new THREE.Vector3(0.03, 0.14, 0.020),
      new THREE.Vector3(-0.01, -0.06, 0.022),
      new THREE.Vector3(-0.03, -0.32, 0.020),
      new THREE.Vector3(-0.03, -0.62, 0.016),
      new THREE.Vector3(-0.02, -0.88, 0.012),
      new THREE.Vector3(0.00, -1.05, 0.008),
    ]);

    // D1 Diagonal Branch
    const d1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 0.08, 0.020),
      new THREE.Vector3(0.14, -0.06, 0.018),
      new THREE.Vector3(0.26, -0.24, 0.016),
      new THREE.Vector3(0.34, -0.46, 0.012),
    ]);

    // D2 Diagonal Branch
    const d2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, -0.22, 0.020),
      new THREE.Vector3(0.06, -0.38, 0.018),
      new THREE.Vector3(0.12, -0.62, 0.014),
    ]);

    // Septal Perforator Artery (dipping into muscular IVS)
    const septalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, 0.04, 0.018),
      new THREE.Vector3(-0.01, -0.08, -0.04),
      new THREE.Vector3(-0.02, -0.22, -0.08),
    ]);

    // LCX Marginal Branch along LV lateral margin
    const lcxCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.46, 0.24, 0.010),
      new THREE.Vector3(0.58, 0.02, 0.012),
      new THREE.Vector3(0.60, -0.28, 0.010),
      new THREE.Vector3(0.50, -0.60, 0.008),
    ]);

    // Transverse Cut Lumen Rings
    const lumenRings = {
      ladCrossSection: new THREE.RingGeometry(0.014, 0.026, 20),
      ladLumenHole: new THREE.CircleGeometry(0.014, 20),
      lcxCrossSection: new THREE.RingGeometry(0.012, 0.022, 18),
      lcxLumenHole: new THREE.CircleGeometry(0.012, 18),
    };

    return {
      lad: new THREE.TubeGeometry(ladCurve, 48, 0.024, 10, false),
      d1: new THREE.TubeGeometry(d1Curve, 24, 0.017, 8, false),
      d2: new THREE.TubeGeometry(d2Curve, 24, 0.014, 8, false),
      septal: new THREE.TubeGeometry(septalCurve, 20, 0.013, 8, false),
      lcx: new THREE.TubeGeometry(lcxCurve, 32, 0.018, 8, false),
      lumenRings,
    };
  }, []);

  if (!isCutOpen) return null;

  return (
    <group
      name="InternalHeartStructuresRoot"
      position={groupPosition}
      rotation={groupRotation}
    >
      {/* ============================================================== */}
      {/* 1. SOLID, CLEAN CORONAL CUT-FACE MYOCARDIAL SLAB               */}
      {/*    Thick LV wall (~12mm) vs Thin RV wall & Prominent Central IVS*/}
      {/* ============================================================== */}
      <mesh
        geometry={cutCapGeo}
        position={[0, 0, cutZ - 0.12]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#be384d" // Fleshy pink-coral spongy myocardium
          map={myocardiumTex}
          roughness={0.34}
          metalness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ============================================================== */}
      {/* 2. DEEP CAVERNOUS CAVITY BACK-SHELLS (Cinematic Burgundy Depth)*/}
      {/* ============================================================== */}
      {/* Left Ventricle Deep Cavity */}
      <mesh
        geometry={lvCavityGeo}
        position={[0.26, -0.28, cutZ - 0.18]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color="#120204" // Deep dark rich shadowy burgundy cavern
          roughness={0.42}
          metalness={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Right Ventricle Deep Cavity */}
      <mesh
        geometry={rvCavityGeo}
        position={[-0.34, -0.28, cutZ - 0.16]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color="#150306" // Deep shadowy burgundy cavern
          roughness={0.42}
          metalness={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ============================================================== */}
      {/* 3. PAPILLARY MUSCLES & MODERATOR BAND                          */}
      {/* ============================================================== */}
      {/* LV Anterolateral Papillary Muscle Pillar */}
      <mesh
        ref={lvPapillaryAnteroRef}
        geometry={papillaryGeos.lvAnterolateral}
        position={[0.33, -0.38, cutZ - 0.08]}
        rotation={[-0.22, 0, 0.16]}
      >
        <meshStandardMaterial color="#8e1828" roughness={0.32} metalness={0.06} />
      </mesh>

      {/* LV Posteromedial Papillary Muscle Pillar */}
      <mesh
        ref={lvPapillaryPosteroRef}
        geometry={papillaryGeos.lvPosteromedial}
        position={[0.22, -0.46, cutZ - 0.14]}
        rotation={[0.22, 0, -0.14]}
      >
        <meshStandardMaterial color="#821424" roughness={0.32} metalness={0.06} />
      </mesh>

      {/* RV Anterior Papillary Muscle Pillar */}
      <mesh
        ref={rvPapillaryAnteroRef}
        geometry={papillaryGeos.rvAnterior}
        position={[-0.34, -0.40, cutZ - 0.08]}
        rotation={[-0.16, 0, -0.24]}
      >
        <meshStandardMaterial color="#8e1828" roughness={0.32} metalness={0.06} />
      </mesh>

      {/* RV Septal Papillary Muscle */}
      <mesh
        geometry={papillaryGeos.rvSeptal}
        position={[-0.12, -0.23, cutZ - 0.06]}
        rotation={[0.10, 0, -0.30]}
      >
        <meshStandardMaterial color="#821424" roughness={0.34} metalness={0.06} />
      </mesh>

      {/* Moderator Band: Prominent Muscular Bridge from IVS to RV Papillary */}
      <mesh geometry={moderatorBandGeo} position={[0, 0, cutZ - 0.06]}>
        <meshStandardMaterial color="#a01d30" roughness={0.30} metalness={0.06} />
      </mesh>

      {/* ============================================================== */}
      {/* 4. ORDERLY, ELEGANT CHORDAE TENDINEAE FANS                     */}
      {/*    Glistening pearlescent white fibrous suspension chords      */}
      {/* ============================================================== */}
      <group ref={chordaeGroupRef}>
        {chordaeGeometries.map((geo, idx) => (
          <mesh key={`chordae_${idx}`} geometry={geo} position={[0, 0, cutZ - 0.06]}>
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.15}
              metalness={0.10}
              emissive="#ffffff"
              emissiveIntensity={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* ============================================================== */}
      {/* 5. MITRAL VALVE (Bicuspid Apparatus with Annulus)              */}
      {/* ============================================================== */}
      <group position={[0.26, 0.12, cutZ - 0.08]} rotation={[0.32, 0.12, 0]}>
        {/* Fibrous Annulus Ring */}
        <mesh geometry={mitralAnnulusGeo}>
          <meshStandardMaterial color="#fff1f2" roughness={0.24} metalness={0.06} />
        </mesh>

        {/* Anterior Leaflet */}
        <mesh
          ref={mitralAntLeafletRef}
          geometry={mitralAnteriorLeafletGeo}
          position={[0, 0, 0.015]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.20}
            metalness={0.04}
            transparent={true}
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Scalloped Posterior Leaflet */}
        <mesh
          ref={mitralPostLeafletRef}
          geometry={mitralPosteriorLeafletGeo}
          position={[0, 0, -0.015]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.20}
            metalness={0.04}
            transparent={true}
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 6. TRICUSPID VALVE (3 Leaflets with Annulus)                   */}
      {/* ============================================================== */}
      <group position={[-0.22, 0.12, cutZ - 0.07]} rotation={[0.22, -0.18, 0]}>
        {/* Fibrous Annulus Ring */}
        <mesh geometry={tricuspidAnnulusGeo}>
          <meshStandardMaterial color="#fff1f2" roughness={0.24} metalness={0.06} />
        </mesh>

        {/* Anterior Leaflet */}
        <mesh
          ref={tricuspidAntRef}
          geometry={tricuspidLeafletGeos.anterior}
          position={[0, 0, 0.01]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.22}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Posterior Leaflet */}
        <mesh
          ref={tricuspidPostRef}
          geometry={tricuspidLeafletGeos.posterior}
          position={[0, 0, -0.01]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.22}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Septal Leaflet */}
        <mesh
          ref={tricuspidSeptalRef}
          geometry={tricuspidLeafletGeos.septal}
          position={[0.08, -0.02, 0.0]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.22}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 7. AORTIC VALVE & SINUSES OF VALSALVA (LV Outflow Tract)       */}
      {/* ============================================================== */}
      <group
        ref={aorticValveRootRef}
        position={[0.07, 0.32, cutZ - 0.04]}
        rotation={[0.15, 0.10, 0]}
      >
        <mesh geometry={aorticValveGeos.rootSinusesGeo}>
          <meshStandardMaterial
            color="#9e1c2e"
            roughness={0.26}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Left Coronary Ostium */}
        <mesh
          geometry={aorticValveGeos.ostiumGeo}
          position={[0.08, 0.02, 0.06]}
          rotation={[0, Math.PI / 3, 0]}
        >
          <meshStandardMaterial color="#e11d48" roughness={0.25} />
        </mesh>

        {/* Right Coronary Ostium */}
        <mesh
          geometry={aorticValveGeos.ostiumGeo}
          position={[-0.08, 0.02, 0.06]}
          rotation={[0, -Math.PI / 3, 0]}
        >
          <meshStandardMaterial color="#e11d48" roughness={0.25} />
        </mesh>

        {/* Semilunar Cusps */}
        <mesh ref={aorticCuspRef1} geometry={aorticValveGeos.cuspGeo} rotation={[0.28, 0, 0]}>
          <meshStandardMaterial
            color="#ffe4e6"
            roughness={0.20}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh ref={aorticCuspRef2} geometry={aorticValveGeos.cuspGeo} rotation={[0.28, (Math.PI * 2) / 3, 0]}>
          <meshStandardMaterial
            color="#ffe4e6"
            roughness={0.20}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh ref={aorticCuspRef3} geometry={aorticValveGeos.cuspGeo} rotation={[0.28, (Math.PI * 4) / 3, 0]}>
          <meshStandardMaterial
            color="#ffe4e6"
            roughness={0.20}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 8. PULMONARY VALVE & INFUNDIBULAR OUTFLOW TRACT (RVOT)         */}
      {/*    Hollow open lumen sitting cleanly atop cutaway               */}
      {/* ============================================================== */}
      <group
        ref={pulmonaryValveRootRef}
        position={[-0.08, 0.40, cutZ + 0.02]}
        rotation={[-0.10, -0.15, 0]}
      >
        <mesh geometry={pulmonaryValveGeos.infundibulumGeo}>
          <meshStandardMaterial
            color="#991c2e"
            roughness={0.28}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Pulmonary Outflow Hollow Open Lumen Ring and Dark Cap */}
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={pulmonaryValveGeos.lumenRing} attach="geometry" />
          <meshStandardMaterial color="#991c2e" roughness={0.24} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.068, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={pulmonaryValveGeos.lumenCap} attach="geometry" />
          <meshBasicMaterial color="#060102" side={THREE.DoubleSide} />
        </mesh>

        {/* Pulmonary Cusps */}
        <mesh ref={pulmonaryCuspRef1} geometry={pulmonaryValveGeos.cuspGeo} rotation={[0.26, 0, 0]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.20} transparent opacity={0.88} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={pulmonaryCuspRef2} geometry={pulmonaryValveGeos.cuspGeo} rotation={[0.26, (Math.PI * 2) / 3, 0]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.20} transparent opacity={0.88} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={pulmonaryCuspRef3} geometry={pulmonaryValveGeos.cuspGeo} rotation={[0.26, (Math.PI * 4) / 3, 0]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.20} transparent opacity={0.88} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 9. SCARLET RED LAD RUNNING OVER CUT SEPTAL CREST               */}
      {/*    Signature feature of Reference Image 3                      */}
      {/* ============================================================== */}
      <group position={[0, 0, cutZ]}>
        {/* Main LAD Trunk along Anterior Groove */}
        <mesh
          geometry={coronaryVesselGeos.lad}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD', true);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LAD');
            if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredVessel(null);
            if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
          }}
        >
          <meshStandardMaterial
            color={ladColor}
            roughness={0.20}
            metalness={0.08}
            emissive={selectedVessel === 'LAD' ? ladColor : '#000000'}
            emissiveIntensity={selectedVessel === 'LAD' ? 0.45 : hoveredVessel === 'LAD' ? 0.22 : 0.0}
          />
        </mesh>

        {/* LAD Cut-Plane Cross-Section Ring */}
        <group position={[0.06, 0.28, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={coronaryVesselGeos.lumenRings.ladCrossSection}>
            <meshStandardMaterial color={ladColor} roughness={0.22} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.002]} geometry={coronaryVesselGeos.lumenRings.ladLumenHole}>
            <meshBasicMaterial color="#060102" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* D1 Diagonal Branch */}
        <mesh geometry={coronaryVesselGeos.d1}>
          <meshStandardMaterial color={ladColor} roughness={0.20} metalness={0.08} />
        </mesh>

        {/* D2 Diagonal Branch */}
        <mesh geometry={coronaryVesselGeos.d2}>
          <meshStandardMaterial color={ladColor} roughness={0.20} metalness={0.08} />
        </mesh>

        {/* Septal Branch dipping into IVS */}
        <mesh geometry={coronaryVesselGeos.septal}>
          <meshStandardMaterial color={ladColor} roughness={0.20} metalness={0.08} />
        </mesh>

        {/* LCX Marginal Branch along LV Lateral Border */}
        <mesh
          geometry={coronaryVesselGeos.lcx}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX', true);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LCX');
            if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredVessel(null);
            if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
          }}
        >
          <meshStandardMaterial
            color={lcxColor}
            roughness={0.22}
            metalness={0.08}
            emissive={selectedVessel === 'LCX' ? lcxColor : '#000000'}
            emissiveIntensity={selectedVessel === 'LCX' ? 0.45 : hoveredVessel === 'LCX' ? 0.22 : 0.0}
          />
        </mesh>

        {/* LCX Cut-Plane Cross-Section Ring */}
        <group position={[0.46, 0.24, 0.010]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={coronaryVesselGeos.lumenRings.lcxCrossSection}>
            <meshStandardMaterial color={lcxColor} roughness={0.22} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.002]} geometry={coronaryVesselGeos.lumenRings.lcxLumenHole}>
            <meshBasicMaterial color="#060102" side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 10. INTERACTIVE ANATOMY PINS (Clean, responsive, non-cluttering)*/}
      {/* ============================================================== */}
      {Object.values(INTERNAL_HEART_STRUCTURES).map((item) => {
        // Pins sit slightly in front of cut plane for crisp interactivity
        const pinPos: [number, number, number] = [
          item.position[0],
          item.position[1],
          cutZ + 0.02,
        ];

        return (
          <AnatomicalPin
            key={item.id}
            id={item.id}
            name={item.name}
            position={pinPos}
            isSelected={selectedStructure === item.id}
            onSelect={(id) => setSelectedStructure(id)}
          />
        );
      })}
    </group>
  );
};
