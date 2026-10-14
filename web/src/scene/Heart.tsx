import React, { useMemo, useEffect, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { InternalHeartStructures } from './InternalHeartStructures';
import { getVesselColorThree } from './vesselConfig';
import { computeCardiacMotion } from './cardiacMotion';
import { cardiacAudio } from '../audio/cardiacAudio';

/**
 * Generates photorealistic high-resolution procedural textures:
 * 1. Diffuse Map (2048x2048): anatomical muscle striations, subepicardial adipose fat cushions
 *    precisely aligned with the front UV coordinates (U=0.25, V=0.50), and arborescent vascular
 *    microcapillaries matching reference 1308447_o.jpg.
 * 2. Bump Map (2048x2048): organic tissue grain, tactile fat cushion elevation, arteriolar ridges.
 * 3. Roughness Map (2048x2048): glistening surgical wet sheen with clearcoat specular highlights.
 */
function createHeartTextures(): {
  diffuse: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} | null {
  if (typeof document === 'undefined') return null;

  const width = 2048;
  const height = 2048;

  // Center of anterior face on a Three.js SphereGeometry is at U = 0.25, V = 0.50
  // On 2048x2048 canvas: center X = 512, center Y = 1024
  const frontCenterX = 512;

  // =========================================================================
  // 1. DIFFUSE MAP CANVAS
  // =========================================================================
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const ctx = diffCanvas.getContext('2d');
  if (!ctx) return null;

  // Rich anatomical myocardium base gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0.0, '#66101e'); // Superior base
  baseGrad.addColorStop(0.24, '#991b2c'); // Upper ventricle
  baseGrad.addColorStop(0.58, '#881525'); // Mid ventricle
  baseGrad.addColorStop(0.85, '#6e0f1c'); // Lower ventricle
  baseGrad.addColorStop(1.0, '#4a0912'); // Apex tip
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Muscle fiber striations (flowing helical spiral grain matching reference 1308447_o.jpg)
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let y = 0; y < height; y += 6) {
    ctx.beginPath();
    ctx.strokeStyle = y % 12 === 0 ? '#b82a3d' : '#450913';
    ctx.lineWidth = 2.4;
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 24) {
      const dy = Math.sin(x * 0.008 + y * 0.015) * 8 + (x / width) * 22;
      ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Diagonal myofiber cross-hatching
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = '#a62435';
  ctx.lineWidth = 1.6;
  for (let x = -height; x < width + height; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 0.55, height);
    ctx.stroke();
  }
  ctx.restore();

  // =========================================================================
  // SUBEPICARDIAL ADIPOSE TISSUE (Fat Cushions) - Hallmark of 1308447_o.jpg
  // Golden-yellow/amber fat deposits centered around front coordinates (X = 512)
  // =========================================================================
  ctx.save();

  // A. Coronary Sulcus (AV Groove) Horizontal Fat Belt across base (Y = 480 to 820)
  const avFatGrad = ctx.createLinearGradient(0, 480, 0, 840);
  avFatGrad.addColorStop(0.0, 'rgba(214, 158, 56, 0.0)');
  avFatGrad.addColorStop(0.25, 'rgba(218, 160, 52, 0.60)');
  avFatGrad.addColorStop(0.50, 'rgba(235, 185, 75, 0.85)');
  avFatGrad.addColorStop(0.75, 'rgba(196, 134, 40, 0.55)');
  avFatGrad.addColorStop(1.0, 'rgba(180, 110, 30, 0.0)');
  ctx.fillStyle = avFatGrad;
  ctx.fillRect(frontCenterX - 360, 480, 720, 360);

  // B. Anterior Interventricular Sulcus Fat Cushion (Runs diagonally where LAD travels)
  const sulcusFatGrad = ctx.createRadialGradient(frontCenterX + 25, 960, 30, frontCenterX + 25, 960, 360);
  sulcusFatGrad.addColorStop(0.0, 'rgba(238, 192, 85, 0.85)');
  sulcusFatGrad.addColorStop(0.35, 'rgba(218, 160, 52, 0.65)');
  sulcusFatGrad.addColorStop(0.70, 'rgba(185, 120, 40, 0.35)');
  sulcusFatGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sulcusFatGrad;
  ctx.fillRect(frontCenterX - 240, 600, 480, 800);

  // C. Lower Sulcus Fat Cushion towards Apex
  const lowerFatGrad = ctx.createRadialGradient(frontCenterX - 15, 1380, 20, frontCenterX - 15, 1380, 240);
  lowerFatGrad.addColorStop(0.0, 'rgba(224, 168, 62, 0.70)');
  lowerFatGrad.addColorStop(0.5, 'rgba(190, 125, 40, 0.40)');
  lowerFatGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lowerFatGrad;
  ctx.fillRect(frontCenterX - 180, 1150, 360, 500);

  // D. Stippled Adipose Lipid Nodules (Natural anatomical fat texture)
  const fatCenters = [
    { x: frontCenterX - 120, y: 640, r: 130, density: 100 },
    { x: frontCenterX + 110, y: 650, r: 140, density: 110 },
    { x: frontCenterX + 20, y: 880, r: 120, density: 90 },
    { x: frontCenterX - 10, y: 1160, r: 100, density: 80 },
    { x: frontCenterX - 25, y: 1420, r: 70, density: 50 },
  ];

  for (const fc of fatCenters) {
    for (let i = 0; i < fc.density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * fc.r;
      const gx = fc.x + Math.cos(angle) * dist;
      const gy = fc.y + Math.sin(angle) * dist;
      const gr = 3 + Math.random() * 8;

      const globuleGrad = ctx.createRadialGradient(gx - gr * 0.25, gy - gr * 0.25, 1, gx, gy, gr);
      globuleGrad.addColorStop(0.0, 'rgba(250, 222, 135, 0.70)');
      globuleGrad.addColorStop(0.6, 'rgba(218, 160, 52, 0.45)');
      globuleGrad.addColorStop(1.0, 'rgba(165, 100, 25, 0.0)');
      ctx.fillStyle = globuleGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // =========================================================================
  // ARBORESCENT MICROVASCULAR CAPILLARIES (Spider microvessels in 1308447_o.jpg)
  // =========================================================================
  ctx.save();
  ctx.strokeStyle = '#c92437';
  ctx.lineWidth = 2.0;
  ctx.globalAlpha = 0.55;

  const microBranches = [
    { startX: frontCenterX + 30, startY: 760, angle: 0.55, len: 240, depth: 4 },
    { startX: frontCenterX + 20, startY: 980, angle: 0.68, len: 220, depth: 4 },
    { startX: frontCenterX + 10, startY: 1220, angle: 0.64, len: 200, depth: 4 },
    { startX: frontCenterX - 10, startY: 820, angle: 2.45, len: 200, depth: 4 },
    { startX: frontCenterX - 20, startY: 1080, angle: 2.32, len: 180, depth: 4 },
    { startX: frontCenterX - 15, startY: 1360, angle: 2.25, len: 150, depth: 3 },
  ];

  function drawMicroBranch(x: number, y: number, angle: number, length: number, depth: number) {
    if (depth <= 0 || length < 10) return;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    ctx!.beginPath();
    ctx!.moveTo(x, y);
    ctx!.quadraticCurveTo(
      (x + endX) / 2 + (Math.random() - 0.5) * 14,
      (y + endY) / 2 + (Math.random() - 0.5) * 14,
      endX,
      endY
    );
    ctx!.stroke();

    drawMicroBranch(endX, endY, angle + 0.35 + Math.random() * 0.16, length * 0.68, depth - 1);
    drawMicroBranch(endX, endY, angle - 0.35 - Math.random() * 0.16, length * 0.65, depth - 1);
  }

  microBranches.forEach((b) => drawMicroBranch(b.startX, b.startY, b.angle, b.len, b.depth));
  ctx.restore();

  // =========================================================================
  // 2. BUMP MAP CANVAS (Tactile 3D tissue relief, fat cushion bumps, grooves)
  // =========================================================================
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');
  if (!bCtx) return null;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // Muscle fiber bump
  bCtx.save();
  bCtx.globalAlpha = 0.20;
  for (let y = 0; y < height; y += 6) {
    bCtx.beginPath();
    bCtx.strokeStyle = y % 12 === 0 ? '#ffffff' : '#000000';
    bCtx.lineWidth = 2.4;
    bCtx.moveTo(0, y);
    for (let x = 0; x < width; x += 24) {
      const dy = Math.sin(x * 0.008 + y * 0.015) * 8 + (x / width) * 22;
      bCtx.lineTo(x, y + dy);
    }
    bCtx.stroke();
  }
  bCtx.restore();

  // Fat cushion raised tactile bumps
  bCtx.save();
  for (const fc of fatCenters) {
    const bumpFatGrad = bCtx.createRadialGradient(fc.x, fc.y, 20, fc.x, fc.y, fc.r * 1.1);
    bumpFatGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.38)');
    bumpFatGrad.addColorStop(0.6, 'rgba(220, 220, 220, 0.18)');
    bumpFatGrad.addColorStop(1.0, 'rgba(128, 128, 128, 0.0)');
    bCtx.fillStyle = bumpFatGrad;
    bCtx.fillRect(fc.x - fc.r * 1.2, fc.y - fc.r * 1.2, fc.r * 2.4, fc.r * 2.4);
  }
  bCtx.restore();

  // Arteriolar raised relief
  bCtx.save();
  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 2.4;
  bCtx.globalAlpha = 0.42;
  microBranches.forEach((b) => {
    const drawBumpBranch = (x: number, y: number, angle: number, length: number, depth: number) => {
      if (depth <= 0 || length < 10) return;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      bCtx!.beginPath();
      bCtx!.moveTo(x, y);
      bCtx!.lineTo(endX, endY);
      bCtx!.stroke();
      drawBumpBranch(endX, endY, angle + 0.35, length * 0.68, depth - 1);
      drawBumpBranch(endX, endY, angle - 0.35, length * 0.65, depth - 1);
    };
    drawBumpBranch(b.startX, b.startY, b.angle, b.len, b.depth);
  });
  bCtx.restore();

  // =========================================================================
  // 3. ROUGHNESS MAP CANVAS (Glistening surgical wet sheen)
  // =========================================================================
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d');
  if (!rCtx) return null;

  // Base wet myocardium sheen ~0.20 (dark value = high specular gloss)
  rCtx.fillStyle = '#303030';
  rCtx.fillRect(0, 0, width, height);

  // Adipose tissue has slightly higher diffusion (roughness ~0.35)
  rCtx.save();
  for (const fc of fatCenters) {
    const roughFatGrad = rCtx.createRadialGradient(fc.x, fc.y, 10, fc.x, fc.y, fc.r);
    roughFatGrad.addColorStop(0.0, 'rgba(90, 90, 90, 0.50)');
    roughFatGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    rCtx.fillStyle = roughFatGrad;
    rCtx.fillRect(fc.x - fc.r, fc.y - fc.r, fc.r * 2, fc.r * 2);
  }
  rCtx.restore();

  // Create Three.js textures
  const diffuseTex = new THREE.CanvasTexture(diffCanvas);
  diffuseTex.colorSpace = THREE.SRGBColorSpace;
  diffuseTex.wrapS = THREE.RepeatWrapping;
  diffuseTex.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.ClampToEdgeWrapping;

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.ClampToEdgeWrapping;

  return { diffuse: diffuseTex, bump: bumpTex, roughness: roughTex };
}

const ProceduralHeart: React.FC = () => {
  const heartOpacity = useStore((state) => state.heartOpacity);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const ladProb = useStore((state) => state.prediction.vessels.LAD?.prob ?? 0.5);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const hoveredVessel = useStore((state) => state.hoveredVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setHoveredVessel = useStore((state) => state.setHoveredVessel);
  const invalidate = useThree((state) => state.invalidate);

  // References for live 60 FPS cardiac biomechanical motion
  const ventriclesRef = useRef<THREE.Group>(null);
  const greatVesselsRef = useRef<THREE.Group>(null);
  const atriaRef = useRef<THREE.Group>(null);
  const lastPhaseRef = useRef<string>('');

  const ladColor = useMemo(() => getVesselColorThree(ladProb, colorblindMode), [ladProb, colorblindMode]);
  const isLadSelected = selectedVessel === 'LAD';
  const isLadHovered = hoveredVessel === 'LAD';

  // Synchronized surgical clipping plane
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

  useEffect(() => {
    invalidate();
  }, [heartOpacity, isCutOpen, dissectionPlane, cutDepth, invalidate]);

  const lastSoundRef = useRef<'s1' | 's2' | 'none'>('none');

  // Live cardiac biomechanical animation loop matching physiological Wiggers cycle
  useFrame((state) => {
    const {
      isBeating,
      heartRateBpm,
      beatingSpeed,
      setCardiacCyclePhase,
      cardiacPhase,
      patientInputs,
      isAudioMuted,
      isPlaying,
    } = useStore.getState();

    const rawEf = Number(patientInputs['EF-TTE'] || 50);
    const motion = computeCardiacMotion(
      state.clock.getElapsedTime(),
      heartRateBpm,
      beatingSpeed,
      isBeating,
      rawEf,
      cardiacPhase
    );

    // Audio sound triggers during active beating
    if (isPlaying && isBeating && cardiacPhase === 'auto' && !isAudioMuted) {
      if (motion.phase >= 0.04 && motion.phase <= 0.12 && lastSoundRef.current !== 's1') {
        cardiacAudio.playS1();
        lastSoundRef.current = 's1';
      } else if (motion.phase >= 0.36 && motion.phase <= 0.44 && lastSoundRef.current !== 's2') {
        cardiacAudio.playS2();
        lastSoundRef.current = 's2';
      } else if (motion.phase > 0.50 && motion.phase < 0.90 && lastSoundRef.current !== 'none') {
        lastSoundRef.current = 'none';
      }
    }

    // 1. Ventricular systolic contraction & wringing torsion
    if (ventriclesRef.current) {
      const radialScale = 1.0 - motion.contraction * 0.088;
      ventriclesRef.current.scale.x = radialScale;
      ventriclesRef.current.scale.z = radialScale;
      ventriclesRef.current.scale.y = 1.0 - motion.shortening * 0.85;

      // Helical cardiac torsion (apex counter-clockwise wringing action)
      ventriclesRef.current.rotation.y = motion.torsion;
      ventriclesRef.current.rotation.z = -motion.contraction * 0.018;
    }

    // 2. Great vessels systolic ejection pulse (aorta & pulmonary trunk)
    if (greatVesselsRef.current) {
      const pulse = 1.0 + motion.ejectionPulse * 0.75;
      greatVesselsRef.current.scale.set(pulse, 1.0 + motion.ejectionPulse * 0.25, pulse);
    }

    // 3. Atria & auricles pre-systolic atrial kick
    if (atriaRef.current) {
      const kick = 1.0 - motion.atrialKick * 0.75;
      atriaRef.current.scale.set(kick, kick, kick);
    }

    // Sync HUD cardiac cycle phase
    if (lastPhaseRef.current !== motion.phaseName) {
      lastPhaseRef.current = motion.phaseName;
      setCardiacCyclePhase(motion.phaseName);
    }
  });

  // Procedural anatomical textures
  const textures = useMemo(() => createHeartTextures(), []);

  // 1. Ventricular Myocardium Geometry (Exact 3D contour from reference 1308447_o.jpg)
  const myocardiumGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 72, 54);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = Math.max(0, Math.min(1, (v.y + 1.0) / 2.0));
      // Conical tapering toward the apex (-y)
      const taper = 0.28 + 0.72 * Math.sqrt(t);
      v.x *= taper;
      v.z *= taper;

      // Left ventricle muscular rounded dome (patient left, x > 0)
      if (v.x > 0) {
        v.x *= 1.16;
      }

      // Posterior diaphragmatic flattening (z < 0)
      if (v.z < 0) {
        v.z *= 0.85;
      }

      // Anterior interventricular sulcus where LAD runs
      if (v.z > 0 && v.x > 0.04 && v.x < 0.38) {
        const distFromGrooveCenter = Math.abs(v.x - 0.20) / 0.16;
        const indent = Math.max(0, 1.0 - distFromGrooveCenter) * 0.056;
        v.z -= indent;
      }

      // Apex gentle curve to anatomical left and forward
      if (v.y < -0.68) {
        const apexFactor = Math.abs(v.y + 0.68) / 0.32;
        v.x -= 0.035 * apexFactor;
        v.z -= 0.022 * apexFactor;
      }

      // Elongate along long axis
      v.y *= 1.18;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Aortic Arch Geometry (Tubular arch sweeping over superior aspect)
  const aorticArchGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 0.48, 0.16),
      new THREE.Vector3(0.05, 0.82, 0.14),
      new THREE.Vector3(0.02, 1.10, 0.05),
      new THREE.Vector3(-0.06, 1.18, -0.09),
      new THREE.Vector3(-0.16, 1.02, -0.25),
      new THREE.Vector3(-0.20, 0.65, -0.32),
    ]);
    return new THREE.TubeGeometry(curve, 36, 0.19, 22, false);
  }, []);

  // 3. Three Upright Brachiocephalic Head Branch Arteries with Open Hollow Lumens (1308447_o.jpg hallmark)
  const archBranches = useMemo(() => {
    // 1. Innominate / Brachiocephalic trunk (rightmost of the 3)
    const b1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 1.08, 0.07),
      new THREE.Vector3(0.10, 1.25, 0.09),
      new THREE.Vector3(0.15, 1.42, 0.11),
    ]);
    // 2. Left Common Carotid (middle)
    const b2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 1.14, 0.01),
      new THREE.Vector3(0.00, 1.28, 0.00),
      new THREE.Vector3(0.01, 1.45, -0.01),
    ]);
    // 3. Left Subclavian (leftmost of the 3)
    const b3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, 1.14, -0.07),
      new THREE.Vector3(-0.09, 1.27, -0.09),
      new THREE.Vector3(-0.12, 1.40, -0.11),
    ]);

    return {
      b1: new THREE.TubeGeometry(b1Curve, 16, 0.062, 16, false),
      b2: new THREE.TubeGeometry(b2Curve, 16, 0.050, 16, false),
      b3: new THREE.TubeGeometry(b3Curve, 16, 0.050, 16, false),
    };
  }, []);

  // 4. Pulmonary Trunk & Bifurcation (Crosses anterior to aorta with open branch lumens per 1308447_o.jpg)
  const pulmonaryGeometries = useMemo(() => {
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.48, 0.28),
      new THREE.Vector3(-0.05, 0.72, 0.27),
      new THREE.Vector3(-0.01, 0.88, 0.22),
    ]);
    const rightBranchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 0.88, 0.22),
      new THREE.Vector3(0.20, 0.86, 0.14),
      new THREE.Vector3(0.48, 0.82, 0.05),
    ]);
    const leftBranchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 0.88, 0.22),
      new THREE.Vector3(-0.18, 0.84, 0.12),
      new THREE.Vector3(-0.36, 0.78, -0.04),
    ]);

    return {
      trunk: new THREE.TubeGeometry(trunkCurve, 24, 0.175, 18, false),
      rightBranch: new THREE.TubeGeometry(rightBranchCurve, 22, 0.138, 16, false),
      leftBranch: new THREE.TubeGeometry(leftBranchCurve, 20, 0.135, 16, false),
    };
  }, []);

  // 5. Epicardial Raised 3D Coronary Artery Tree with Diagonal Branches (Prominent in 1308447_o.jpg)
  const epicardialVessels = useMemo(() => {
    // Main LAD Trunk
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 0.46, 0.36),
      new THREE.Vector3(0.08, 0.24, 0.54),
      new THREE.Vector3(0.12, 0.00, 0.60),
      new THREE.Vector3(0.10, -0.32, 0.57),
      new THREE.Vector3(0.06, -0.65, 0.46),
      new THREE.Vector3(0.02, -0.92, 0.32),
      new THREE.Vector3(-0.02, -1.10, 0.18),
    ]);

    // First Diagonal Branch (D1)
    const d1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, 0.18, 0.56),
      new THREE.Vector3(0.22, 0.06, 0.52),
      new THREE.Vector3(0.34, -0.12, 0.43),
      new THREE.Vector3(0.42, -0.34, 0.30),
    ]);

    // D1 Sub-branch
    const d1SubCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.22, 0.06, 0.52),
      new THREE.Vector3(0.28, -0.05, 0.48),
      new THREE.Vector3(0.36, -0.18, 0.38),
    ]);

    // Second Diagonal Branch (D2)
    const d2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.11, -0.16, 0.59),
      new THREE.Vector3(0.20, -0.34, 0.49),
      new THREE.Vector3(0.28, -0.56, 0.37),
      new THREE.Vector3(0.32, -0.76, 0.23),
    ]);

    // Third Apical Diagonal (D3)
    const d3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, -0.50, 0.51),
      new THREE.Vector3(0.16, -0.68, 0.41),
      new THREE.Vector3(0.20, -0.88, 0.28),
    ]);

    // RV Anterior Branches (spreading over right ventricle)
    const rv1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.07, 0.24, 0.54),
      new THREE.Vector3(-0.08, 0.14, 0.49),
      new THREE.Vector3(-0.22, -0.04, 0.39),
      new THREE.Vector3(-0.32, -0.22, 0.26),
    ]);

    const rv2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, -0.28, 0.57),
      new THREE.Vector3(-0.04, -0.42, 0.47),
      new THREE.Vector3(-0.14, -0.62, 0.35),
    ]);

    const rv3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, -0.62, 0.47),
      new THREE.Vector3(-0.02, -0.78, 0.38),
      new THREE.Vector3(-0.08, -0.95, 0.25),
    ]);

    return {
      lad: new THREE.TubeGeometry(ladCurve, 48, 0.028, 10, false),
      d1: new THREE.TubeGeometry(d1Curve, 24, 0.020, 8, false),
      d1Sub: new THREE.TubeGeometry(d1SubCurve, 18, 0.014, 6, false),
      d2: new THREE.TubeGeometry(d2Curve, 24, 0.017, 8, false),
      d3: new THREE.TubeGeometry(d3Curve, 18, 0.014, 6, false),
      rv1: new THREE.TubeGeometry(rv1Curve, 24, 0.017, 8, false),
      rv2: new THREE.TubeGeometry(rv2Curve, 20, 0.015, 6, false),
      rv3: new THREE.TubeGeometry(rv3Curve, 18, 0.013, 6, false),
    };
  }, []);

  // 6. Sculpted Atria & Wrinkled Auricular Flaps (True canine-ear flaps)
  const atriaGeo = useMemo(() => new THREE.SphereGeometry(1.0, 32, 24), []);
  const auricleGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.26, 0.46, 22, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const angle = Math.atan2(pos.getZ(i), pos.getX(i));
      // Pleated ripples matching canine auricle anatomy
      const ripple = 1.0 + Math.sin(angle * 5) * 0.12 * (1.0 - (y + 0.23) / 0.46);
      pos.setX(i, pos.getX(i) * ripple);
      pos.setZ(i, pos.getZ(i) * ripple);
    }
    geo.computeVertexNormals();
    geo.rotateZ(Math.PI / 4.0);
    return geo;
  }, []);

  // 7. Superior Vena Cava (SVC)
  const svcGeo = useMemo(() => new THREE.CylinderGeometry(0.13, 0.14, 0.62, 20), []);

  // 8. Lateral Pulmonary Vein Stubs
  const pvGeo = useMemo(() => new THREE.CylinderGeometry(0.078, 0.082, 0.28, 16), []);

  const isTranslucent = heartOpacity < 0.85;

  // Solid, dense, glistening PBR material matching reference 1308447_o.jpg
  const myocardiumMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#9c1c2e',
      map: textures?.diffuse ?? null,
      bumpMap: textures?.bump ?? null,
      bumpScale: 0.026,
      roughnessMap: textures?.roughness ?? null,
      roughness: 0.20,
      metalness: 0.04,
      clearcoat: 1.0, // Full glistening surgical clearcoat per 1308447_o.jpg
      clearcoatRoughness: 0.12,
      transparent: isTranslucent,
      opacity: heartOpacity,
      depthWrite: true,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [textures, heartOpacity, isTranslucent, clippingPlane]);

  const greatVesselMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#9e1c2e', // Arterial deep crimson
      roughness: 0.18, // High specular gloss on aorta
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transparent: isTranslucent,
      opacity: heartOpacity,
      depthWrite: true,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [heartOpacity, isTranslucent, clippingPlane]);

  const venousMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#3b3750', // Venous deep slate-plum
      roughness: 0.22,
      metalness: 0.06,
      clearcoat: 0.80,
      clearcoatRoughness: 0.15,
      transparent: isTranslucent,
      opacity: heartOpacity,
      depthWrite: true,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [heartOpacity, isTranslucent, clippingPlane]);

  const lumenCapMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#060102', // Dark hollow interior lumen
      side: THREE.DoubleSide,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
    });
  }, [clippingPlane]);

  const arteryMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: ladColor,
      roughness: 0.18,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      emissive: isLadSelected ? ladColor : '#000000',
      emissiveIntensity: isLadSelected ? 0.40 : isLadHovered ? 0.20 : 0.0,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
    });
  }, [ladColor, isLadSelected, isLadHovered, clippingPlane]);

  return (
    <group name="CardiacAnatomyRoot">
      {/* ============================================================== */}
      {/* 1. VENTRICULAR MYOCARDIUM BODY & ATTACHED EPICARDIAL VESSELS   */}
      {/*    Undergoes inward systolic contraction & apex wringing twist  */}
      {/* ============================================================== */}
      <group ref={ventriclesRef} name="VentricularContractileUnit">
        <mesh
          geometry={myocardiumGeo}
          material={myocardiumMaterial}
          castShadow={false}
          receiveShadow={false}
        />

        {/* Epicardial Raised 3D Coronary Artery Tree (Pinned to myocardial motion) */}
        <group name="EpicardialCoronaryArteries">
          <mesh
            geometry={epicardialVessels.lad}
            material={arteryMaterial}
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
          />
          <mesh geometry={epicardialVessels.d1} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.d1Sub} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.d2} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.d3} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.rv1} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.rv2} material={arteryMaterial} />
          <mesh geometry={epicardialVessels.rv3} material={arteryMaterial} />
        </group>

        {/* Internal Surgical Dissection Structures (When cut open) */}
        <InternalHeartStructures />
      </group>

      {/* ============================================================== */}
      {/* 2. GREAT OUTFLOW VESSELS (Aortic Arch & Pulmonary Trunk)       */}
      {/*    Undergoes systolic ejection pulse expansion                  */}
      {/* ============================================================== */}
      <group ref={greatVesselsRef} name="GreatVesselsUnit">
        {/* Aortic Arch */}
        <mesh
          geometry={aorticArchGeo}
          material={greatVesselMaterial}
          castShadow={false}
          receiveShadow={false}
        />

        {/* Branch 1: Brachiocephalic / Innominate Trunk with Hollow Lumen */}
        <mesh geometry={archBranches.b1} material={greatVesselMaterial} />
        <mesh position={[0.15, 1.42, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.045, 0.062, 20]} />
          <primitive object={greatVesselMaterial} attach="material" />
        </mesh>
        <mesh position={[0.15, 1.415, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.046, 20]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        {/* Branch 2: Left Common Carotid with Hollow Lumen */}
        <mesh geometry={archBranches.b2} material={greatVesselMaterial} />
        <mesh position={[0.01, 1.45, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.036, 0.050, 18]} />
          <primitive object={greatVesselMaterial} attach="material" />
        </mesh>
        <mesh position={[0.01, 1.445, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.037, 18]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        {/* Branch 3: Left Subclavian with Hollow Lumen */}
        <mesh geometry={archBranches.b3} material={greatVesselMaterial} />
        <mesh position={[-0.12, 1.40, -0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.036, 0.050, 18]} />
          <primitive object={greatVesselMaterial} attach="material" />
        </mesh>
        <mesh position={[-0.12, 1.395, -0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.037, 18]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        {/* Pulmonary Trunk & Bifurcation Branches */}
        <mesh geometry={pulmonaryGeometries.trunk} material={greatVesselMaterial} />
        <mesh geometry={pulmonaryGeometries.rightBranch} material={greatVesselMaterial} />
        <mesh geometry={pulmonaryGeometries.leftBranch} material={greatVesselMaterial} />

        {/* Right Pulmonary branch open lumen (Prominent circular hole on right in 1308447_o.jpg) */}
        <mesh position={[0.48, 0.82, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.105, 0.138, 24]} />
          <primitive object={greatVesselMaterial} attach="material" />
        </mesh>
        <mesh position={[0.475, 0.82, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.106, 24]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        {/* Left Pulmonary branch open lumen */}
        <mesh position={[-0.36, 0.78, -0.04]} rotation={[0, -Math.PI / 2, 0]}>
          <ringGeometry args={[0.102, 0.135, 22]} />
          <primitive object={greatVesselMaterial} attach="material" />
        </mesh>
        <mesh position={[-0.355, 0.78, -0.04]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.103, 22]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 3. ATRIA & AURICLES (Undergoes pre-systolic atrial kick)       */}
      {/* ============================================================== */}
      <group ref={atriaRef} name="AtriaAndAuriclesUnit">
        {/* Right Atrium Body */}
        <mesh
          geometry={atriaGeo}
          material={myocardiumMaterial}
          position={[-0.42, 0.68, -0.12]}
          scale={[0.46, 0.40, 0.40]}
        />

        {/* Right Auricle Draping Over Sulcus (Ruffled canine ear) */}
        <mesh
          geometry={auricleGeo}
          material={myocardiumMaterial}
          position={[-0.28, 0.58, 0.22]}
          rotation={[-0.35, 0.45, -0.20]}
          scale={[1.1, 0.9, 1.1]}
        />

        {/* Left Atrium Body */}
        <mesh
          geometry={atriaGeo}
          material={myocardiumMaterial}
          position={[0.36, 0.72, -0.20]}
          scale={[0.44, 0.38, 0.38]}
        />

        {/* Left Auricle Draping Over Left Border */}
        <mesh
          geometry={auricleGeo}
          material={myocardiumMaterial}
          position={[0.32, 0.52, 0.18]}
          rotation={[0.30, -0.40, 0.25]}
          scale={[1.05, 0.85, 1.05]}
        />

        {/* Superior Vena Cava (SVC) */}
        <mesh
          geometry={svcGeo}
          material={venousMaterial}
          position={[-0.48, 1.05, -0.24]}
          rotation={[0.06, 0, -0.06]}
        />
        <mesh position={[-0.48, 1.36, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.128, 16]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        {/* Dual Right Pulmonary Vein Stubs on Lateral Margin */}
        <mesh
          geometry={pvGeo}
          material={greatVesselMaterial}
          position={[0.56, 0.50, -0.18]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <mesh position={[0.70, 0.50, -0.18]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.076, 16]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>

        <mesh
          geometry={pvGeo}
          material={greatVesselMaterial}
          position={[0.58, 0.30, -0.16]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <mesh position={[0.72, 0.30, -0.16]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.076, 16]} />
          <primitive object={lumenCapMaterial} attach="material" />
        </mesh>
      </group>
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

  const isPlaying = useStore((state) => state.isPlaying);
  const isBeating = useStore((state) => state.isBeating);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const beatingSpeed = useStore((state) => state.beatingSpeed);
  const isAudioMuted = useStore((state) => state.isAudioMuted);
  const lastSoundRef = useRef<'s1' | 's2' | 'none'>('none');

  // Control playback, phase freeze, and physiological rate
  useEffect(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action) {
        const clipDuration = action.getClip().duration || 1.0;
        const speed = (heartRateBpm / 72) * beatingSpeed;
        action.setEffectiveTimeScale(speed);

        if (cardiacPhase === 'systole') {
          action.paused = true;
          action.time = clipDuration * 0.25;
        } else if (cardiacPhase === 'diastole') {
          action.paused = true;
          action.time = clipDuration * 0.70;
        } else {
          // Auto beating
          if (isPlaying && isBeating) {
            action.paused = false;
            action.play();
          } else {
            action.paused = true;
          }
        }
        invalidate();
      }
    }
  }, [actions, names, isPlaying, isBeating, cardiacPhase, heartRateBpm, beatingSpeed, invalidate]);

  // Audio triggers in useFrame
  useFrame(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action && !action.paused && isPlaying && cardiacPhase === 'auto' && !isAudioMuted) {
        const clipDuration = action.getClip().duration || 1.0;
        const progress = (action.time % clipDuration) / clipDuration;
        if (progress >= 0.04 && progress <= 0.12 && lastSoundRef.current !== 's1') {
          cardiacAudio.playS1();
          lastSoundRef.current = 's1';
        } else if (progress >= 0.36 && progress <= 0.44 && lastSoundRef.current !== 's2') {
          cardiacAudio.playS2();
          lastSoundRef.current = 's2';
        } else if (progress > 0.50 && progress < 0.90 && lastSoundRef.current !== 'none') {
          lastSoundRef.current = 'none';
        }
      }
    }
  });

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
  const viewerMode = useStore((state) => state.viewerMode);

  const fallback = <ProceduralHeart />;

  // If user explicitly selected the procedural representation, render it directly
  if (viewerMode === 'procedural') {
    return fallback;
  }

  // Default to photorealistic beating heart with procedural fallback on error/loading
  return (
    <GLTFErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <RealisticBeatingHeart heartOpacity={heartOpacity} />
      </Suspense>
    </GLTFErrorBoundary>
  );
};
