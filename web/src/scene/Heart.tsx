import React, { useMemo, useEffect, useRef, useState, Suspense } from 'react';
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
 * 1. Diffuse Map (2048x2048): anatomical muscle striations, double-helical myofiber bundles,
 *    subepicardial adipose fat cushions precisely aligned with the anterior (U=0.25, V=0.50)
 *    and posterior (U=0.75, V=0.50) sulci, and arborescent microvascular capillaries.
 * 2. Bump Map (2048x2048): tactile tissue grain, raised adipose lobules, sulcal depression
 *    grooves (anterior & posterior interventricular sulci, coronary AV groove), arteriolar ridges.
 * 3. Roughness Map (2048x2048): glistening surgical wet sheen (0.20 base) with clearcoat specular highlights.
 */
function createHeartTextures(): {
  diffuse: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} | null {
  if (typeof document === 'undefined') return null;

  const width = 2048;
  const height = 2048;

  // Anterior face center on Three.js SphereGeometry is at U = 0.25, V = 0.50 (X = 512, Y = 1024)
  const frontCenterX = 512;
  // Posterior face center is at U = 0.75, V = 0.50 (X = 1536, Y = 1024)
  const backCenterX = 1536;

  // =========================================================================
  // 1. DIFFUSE MAP CANVAS
  // =========================================================================
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const ctx = diffCanvas.getContext('2d');
  if (!ctx) return null;

  // Rich anatomical myocardium base gradient: arterial blood-perfused muscle
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0.0, '#5a0d1a'); // Superior atrial base
  baseGrad.addColorStop(0.20, '#941b2c'); // Upper ventricular base
  baseGrad.addColorStop(0.48, '#a81d30'); // Mid ventricle free wall
  baseGrad.addColorStop(0.72, '#881524'); // Lower ventricle
  baseGrad.addColorStop(0.92, '#660d19'); // Apical cone
  baseGrad.addColorStop(1.0, '#440710'); // Apex tip
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Left Ventricle (LV) regional muscular depth: rich deep arterial oxygenation
  const lvToneGrad = ctx.createRadialGradient(frontCenterX + 280, 1050, 60, frontCenterX + 280, 1050, 480);
  lvToneGrad.addColorStop(0.0, 'rgba(180, 32, 54, 0.45)');
  lvToneGrad.addColorStop(0.6, 'rgba(148, 24, 42, 0.20)');
  lvToneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = lvToneGrad;
  ctx.fillRect(frontCenterX, 600, 600, 900);

  // Helical muscle fiber striations (flowing spiral grain converging to apical vortex)
  ctx.save();
  ctx.globalAlpha = 0.24;
  for (let y = 0; y < height; y += 5) {
    ctx.beginPath();
    ctx.strokeStyle = y % 10 === 0 ? '#b82a3d' : '#450913';
    ctx.lineWidth = 2.2;
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 20) {
      const progressToApex = y / height;
      const helicalSweep = Math.sin(x * 0.007 + y * 0.012) * (6 + progressToApex * 8) + (x / width) * 26;
      ctx.lineTo(x, y + helicalSweep);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Fine micro-fibrillar cross-hatching (subepicardial sheet architecture)
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#c42e42';
  ctx.lineWidth = 1.4;
  for (let x = -height; x < width + height; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 0.58, height);
    ctx.stroke();
  }
  ctx.restore();

  // Apical Vortex (Vortex Cordis) swirl pattern at apex base (Y = 1750 to 2048)
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 48; i++) {
    const angleStart = (i / 48) * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = i % 2 === 0 ? '#b52538' : '#3d060e';
    ctx.lineWidth = 1.8;
    for (let r = 240; r > 10; r -= 10) {
      const a = angleStart + (240 - r) * 0.025;
      const vx = frontCenterX + Math.cos(a) * r * 0.65;
      const vy = 1920 + Math.sin(a) * r * 0.35;
      if (r === 240) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // =========================================================================
  // SUBEPICARDIAL ADIPOSE TISSUE (Fat Cushions)
  // Golden-yellow/amber lipid deposits along AV groove & IV sulci
  // =========================================================================
  ctx.save();

  // A. Coronary Sulcus (AV Groove) Horizontal Fat Belt (Y = 460 to 820)
  const avFatGrad = ctx.createLinearGradient(0, 460, 0, 820);
  avFatGrad.addColorStop(0.0, 'rgba(215, 160, 52, 0.0)');
  avFatGrad.addColorStop(0.25, 'rgba(224, 168, 54, 0.65)');
  avFatGrad.addColorStop(0.50, 'rgba(242, 192, 78, 0.88)');
  avFatGrad.addColorStop(0.75, 'rgba(202, 140, 42, 0.58)');
  avFatGrad.addColorStop(1.0, 'rgba(175, 110, 28, 0.0)');
  ctx.fillStyle = avFatGrad;
  ctx.fillRect(0, 460, width, 360);

  // B. Anterior Interventricular Sulcus Fat Cushion (LAD trajectory)
  const antSulcusGrad = ctx.createRadialGradient(frontCenterX + 25, 960, 30, frontCenterX + 25, 960, 380);
  antSulcusGrad.addColorStop(0.0, 'rgba(244, 198, 88, 0.88)');
  antSulcusGrad.addColorStop(0.35, 'rgba(225, 168, 55, 0.68)');
  antSulcusGrad.addColorStop(0.70, 'rgba(190, 126, 38, 0.38)');
  antSulcusGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = antSulcusGrad;
  ctx.fillRect(frontCenterX - 260, 580, 520, 840);

  // C. Lower Sulcus & Apical Notch Fat Cushion
  const lowerFatGrad = ctx.createRadialGradient(frontCenterX - 10, 1420, 20, frontCenterX - 10, 1420, 260);
  lowerFatGrad.addColorStop(0.0, 'rgba(230, 175, 66, 0.72)');
  lowerFatGrad.addColorStop(0.50, 'rgba(196, 132, 42, 0.42)');
  lowerFatGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lowerFatGrad;
  ctx.fillRect(frontCenterX - 200, 1180, 400, 520);

  // D. Posterior Interventricular Sulcus Fat Cushion
  const postSulcusGrad = ctx.createRadialGradient(backCenterX + 15, 1020, 25, backCenterX + 15, 1020, 340);
  postSulcusGrad.addColorStop(0.0, 'rgba(235, 185, 75, 0.82)');
  postSulcusGrad.addColorStop(0.40, 'rgba(215, 155, 50, 0.58)');
  postSulcusGrad.addColorStop(0.80, 'rgba(180, 115, 35, 0.28)');
  postSulcusGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = postSulcusGrad;
  ctx.fillRect(backCenterX - 240, 620, 480, 820);

  // E. Stippled Adipose Lipid Nodules (Macro and micro fat lobules)
  const fatCenters = [
    { x: frontCenterX - 130, y: 620, r: 140, density: 100 },
    { x: frontCenterX + 120, y: 640, r: 150, density: 110 },
    { x: frontCenterX + 25, y: 880, r: 130, density: 85 },
    { x: frontCenterX + 10, y: 1180, r: 110, density: 75 },
    { x: frontCenterX - 15, y: 1440, r: 80, density: 50 },
    { x: backCenterX - 100, y: 640, r: 130, density: 80 },
    { x: backCenterX + 90, y: 650, r: 130, density: 80 },
    { x: backCenterX + 15, y: 980, r: 110, density: 70 },
  ];

  for (const fc of fatCenters) {
    for (let i = 0; i < fc.density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * fc.r;
      const gx = fc.x + Math.cos(angle) * dist;
      const gy = fc.y + Math.sin(angle) * dist;
      const gr = 3.5 + Math.random() * 8.5;

      const globuleGrad = ctx.createRadialGradient(gx - gr * 0.25, gy - gr * 0.25, 1, gx, gy, gr);
      globuleGrad.addColorStop(0.0, 'rgba(254, 232, 155, 0.72)');
      globuleGrad.addColorStop(0.55, 'rgba(224, 168, 56, 0.48)');
      globuleGrad.addColorStop(1.0, 'rgba(165, 102, 26, 0.0)');
      ctx.fillStyle = globuleGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // =========================================================================
  // ARBORESCENT MICROVASCULAR CAPILLARIES (Spreading branching microvessels)
  // =========================================================================
  ctx.save();
  ctx.strokeStyle = '#df283f';
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 0.58;

  const microBranches = [
    { startX: frontCenterX + 35, startY: 740, angle: 0.52, len: 260, depth: 4 },
    { startX: frontCenterX + 25, startY: 960, angle: 0.65, len: 240, depth: 4 },
    { startX: frontCenterX + 15, startY: 1200, angle: 0.62, len: 210, depth: 4 },
    { startX: frontCenterX - 12, startY: 800, angle: 2.48, len: 220, depth: 4 },
    { startX: frontCenterX - 22, startY: 1060, angle: 2.35, len: 190, depth: 4 },
    { startX: frontCenterX - 18, startY: 1340, angle: 2.22, len: 160, depth: 3 },
    // Posterior branches spreading from PDA
    { startX: backCenterX + 20, startY: 820, angle: 0.58, len: 210, depth: 4 },
    { startX: backCenterX - 15, startY: 860, angle: 2.42, len: 200, depth: 4 },
  ];

  function drawMicroBranch(x: number, y: number, angle: number, length: number, depth: number) {
    if (depth <= 0 || length < 10) return;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    ctx!.beginPath();
    ctx!.moveTo(x, y);
    ctx!.quadraticCurveTo(
      (x + endX) / 2 + (Math.random() - 0.5) * 16,
      (y + endY) / 2 + (Math.random() - 0.5) * 16,
      endX,
      endY
    );
    ctx!.stroke();

    drawMicroBranch(endX, endY, angle + 0.36 + Math.random() * 0.16, length * 0.68, depth - 1);
    drawMicroBranch(endX, endY, angle - 0.36 - Math.random() * 0.16, length * 0.65, depth - 1);
  }

  microBranches.forEach((b) => drawMicroBranch(b.startX, b.startY, b.angle, b.len, b.depth));
  ctx.restore();

  // =========================================================================
  // 2. BUMP MAP CANVAS (Tactile tissue relief, fat cushion bumps, sulcal depth)
  // =========================================================================
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');
  if (!bCtx) return null;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // Muscle fiber bump ridges
  bCtx.save();
  bCtx.globalAlpha = 0.22;
  for (let y = 0; y < height; y += 5) {
    bCtx.beginPath();
    bCtx.strokeStyle = y % 10 === 0 ? '#ffffff' : '#000000';
    bCtx.lineWidth = 2.2;
    bCtx.moveTo(0, y);
    for (let x = 0; x < width; x += 20) {
      const progressToApex = y / height;
      const dy = Math.sin(x * 0.007 + y * 0.012) * (6 + progressToApex * 8) + (x / width) * 26;
      bCtx.lineTo(x, y + dy);
    }
    bCtx.stroke();
  }
  bCtx.restore();

  // Sulcal depression grooves in bump map (darker values = depressed groove)
  bCtx.save();
  bCtx.globalAlpha = 0.35;
  bCtx.lineWidth = 32;
  bCtx.strokeStyle = '#404040';
  // Anterior IV Sulcus groove
  bCtx.beginPath();
  bCtx.moveTo(frontCenterX + 35, 600);
  bCtx.quadraticCurveTo(frontCenterX + 20, 1050, frontCenterX - 10, 1600);
  bCtx.stroke();
  // Posterior IV Sulcus groove
  bCtx.beginPath();
  bCtx.moveTo(backCenterX + 15, 600);
  bCtx.quadraticCurveTo(backCenterX + 10, 1050, backCenterX, 1600);
  bCtx.stroke();
  // Horizontal AV Groove
  bCtx.beginPath();
  bCtx.moveTo(0, 620);
  bCtx.lineTo(width, 620);
  bCtx.stroke();
  bCtx.restore();

  // Fat cushion tactile raised elevation
  bCtx.save();
  for (const fc of fatCenters) {
    const bumpFatGrad = bCtx.createRadialGradient(fc.x, fc.y, 15, fc.x, fc.y, fc.r * 1.15);
    bumpFatGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.40)');
    bumpFatGrad.addColorStop(0.55, 'rgba(230, 230, 230, 0.20)');
    bumpFatGrad.addColorStop(1.0, 'rgba(128, 128, 128, 0.0)');
    bCtx.fillStyle = bumpFatGrad;
    bCtx.fillRect(fc.x - fc.r * 1.25, fc.y - fc.r * 1.25, fc.r * 2.5, fc.r * 2.5);
  }
  bCtx.restore();

  // Arteriolar raised relief
  bCtx.save();
  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 2.4;
  bCtx.globalAlpha = 0.45;
  microBranches.forEach((b) => {
    const drawBumpBranch = (x: number, y: number, angle: number, length: number, depth: number) => {
      if (depth <= 0 || length < 10) return;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      bCtx!.beginPath();
      bCtx!.moveTo(x, y);
      bCtx!.lineTo(endX, endY);
      bCtx!.stroke();
      drawBumpBranch(endX, endY, angle + 0.36, length * 0.68, depth - 1);
      drawBumpBranch(endX, endY, angle - 0.36, length * 0.65, depth - 1);
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
  rCtx.fillStyle = '#323232';
  rCtx.fillRect(0, 0, width, height);

  // Serous fluid film in sulci (pooled wet sheen ~ 0.08)
  rCtx.save();
  rCtx.globalAlpha = 0.40;
  rCtx.lineWidth = 36;
  rCtx.strokeStyle = '#151515';
  rCtx.beginPath();
  rCtx.moveTo(frontCenterX + 35, 600);
  rCtx.quadraticCurveTo(frontCenterX + 20, 1050, frontCenterX - 10, 1600);
  rCtx.stroke();
  rCtx.restore();

  // Adipose cushions have slightly higher diffusion (roughness ~0.26)
  rCtx.save();
  for (const fc of fatCenters) {
    const roughFatGrad = rCtx.createRadialGradient(fc.x, fc.y, 10, fc.x, fc.y, fc.r);
    roughFatGrad.addColorStop(0.0, 'rgba(85, 85, 85, 0.48)');
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

/**
 * Creates smooth caliber-tapering tubular geometry along a 3D CatmullRom spline.
 * Provides organic caliber taper from large proximal vessel diameter down to fine terminal arterioles.
 */
function createTaperedTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments: number,
  radiusStart: number,
  radiusEnd: number,
  radialSegments = 16
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let pIndex = 0;
  let uvIndex = 0;

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const p = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radiusStart + (radiusEnd - radiusStart) * u;

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const nx = N.x * cosV + B.x * sinV;
      const ny = N.y * cosV + B.y * sinV;
      const nz = N.z * cosV + B.z * sinV;

      positions[pIndex] = p.x + r * nx;
      positions[pIndex + 1] = p.y + r * ny;
      positions[pIndex + 2] = p.z + r * nz;

      normals[pIndex] = nx;
      normals[pIndex + 1] = ny;
      normals[pIndex + 2] = nz;
      pIndex += 3;

      uvs[uvIndex] = u;
      uvs[uvIndex + 1] = j / radialSegments;
      uvIndex += 2;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Creates a smooth, continuous organic subepicardial adipose fat cushion
 * that runs along the anterior interventricular sulcus bedding the LAD.
 * Uses a C1-smooth cross-sectional bell profile that tapers directly into the myocardial surface.
 */
function createAnteriorSulcusFatGeometry(): THREE.BufferGeometry {
  const lengthSegments = 48;
  const widthSegments = 16;
  const vertexCount = (lengthSegments + 1) * (widthSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let pIdx = 0;
  let uvIdx = 0;

  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const cy = 0.40 - 1.34 * t;
    const cx = 0.06 + 0.06 * Math.sin(t * Math.PI * 0.85) - 0.04 * t;
    const cz = 0.47 + 0.12 * Math.sin(t * Math.PI * 0.90) - 0.22 * t;

    const width = 0.17 * (1.0 - 0.55 * t);
    const peakHeight = 0.032 * (1.0 - 0.48 * t);

    for (let j = 0; j <= widthSegments; j++) {
      const u = (j / widthSegments) * 2.0 - 1.0;
      // C1 smooth bell profile: (1 - u^2)^1.8 ensures zero height & zero derivative at margins
      const profile = Math.pow(Math.max(0, 1.0 - u * u), 1.8);
      const lobule = 1.0 + 0.14 * Math.sin(t * 22.0 + u * 4.0) + 0.08 * Math.cos(t * 36.0);
      const h = peakHeight * profile * lobule;

      const px = cx + u * width;
      const py = cy;
      const pz = cz + h;

      positions[pIdx] = px;
      positions[pIdx + 1] = py;
      positions[pIdx + 2] = pz;

      normals[pIdx] = u * 0.3;
      normals[pIdx + 1] = 0.1;
      normals[pIdx + 2] = 1.0;
      pIdx += 3;

      uvs[uvIdx] = t;
      uvs[uvIdx + 1] = (u + 1.0) / 2.0;
      uvIdx += 2;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * (widthSegments + 1) + j;
      const b = (i + 1) * (widthSegments + 1) + j;
      const c = (i + 1) * (widthSegments + 1) + (j + 1);
      const d = i * (widthSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a smooth, continuous circumferential subepicardial adipose band
 * along the atrioventricular (coronary) sulcus groove.
 */
function createCoronarySulcusFatGeometry(): THREE.BufferGeometry {
  const arcSegments = 64;
  const widthSegments = 14;
  const vertexCount = (arcSegments + 1) * (widthSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let pIdx = 0;
  let uvIdx = 0;

  for (let i = 0; i <= arcSegments; i++) {
    const s = i / arcSegments;
    const phi = -0.85 * Math.PI + s * 1.70 * Math.PI;

    const baseRx = 0.70;
    const baseRz = 0.54 * (Math.cos(phi) > 0 ? 1.06 : 0.88);
    const cx = Math.sin(phi) * baseRx;
    const cz = Math.cos(phi) * baseRz;
    const cy = 0.38 + 0.03 * Math.sin(phi * 2.0);

    const bandWidth = 0.15;
    const peakHeight = 0.035;

    for (let j = 0; j <= widthSegments; j++) {
      const v = (j / widthSegments) * 2.0 - 1.0;
      const profile = Math.pow(Math.max(0, 1.0 - v * v), 1.8);
      const lobule = 1.0 + 0.14 * Math.sin(phi * 12.0 + v * 3.0) + 0.08 * Math.cos(phi * 24.0);
      const h = peakHeight * profile * lobule;

      const dirX = Math.sin(phi);
      const dirZ = Math.cos(phi);

      const px = cx + dirX * h;
      const py = cy + v * bandWidth * 0.5;
      const pz = cz + dirZ * h;

      positions[pIdx] = px;
      positions[pIdx + 1] = py;
      positions[pIdx + 2] = pz;

      normals[pIdx] = dirX;
      normals[pIdx + 1] = v * 0.3;
      normals[pIdx + 2] = dirZ;
      pIdx += 3;

      uvs[uvIdx] = s;
      uvs[uvIdx + 1] = (v + 1.0) / 2.0;
      uvIdx += 2;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < arcSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * (widthSegments + 1) + j;
      const b = (i + 1) * (widthSegments + 1) + j;
      const c = (i + 1) * (widthSegments + 1) + (j + 1);
      const d = i * (widthSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the Left Auricle (atrial appendage):
 * Wrinkled anatomical flap tucked under the pulmonary trunk on the patient left.
 */
function createLeftAuricleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.24, 32, 24);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    v.x *= 1.25;
    v.y *= 0.85;
    v.z *= 1.40;

    const t = (v.z + 0.30) / 0.60;
    v.y -= 0.08 * t * t;
    v.x -= 0.04 * t;

    // Transverse anatomical pectinate creases and wrinkles
    const wrinkle =
      1.0 +
      0.16 * Math.sin(v.z * 24.0 + v.x * 12.0) +
      0.10 * Math.cos(v.y * 32.0 + v.z * 18.0) +
      0.08 * Math.sin(v.x * 30.0);

    v.multiplyScalar(wrinkle);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the Right Auricle:
 * Creased anatomical lobe draping around the right aortic root.
 */
function createRightAuricleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.22, 28, 22);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    v.x *= 1.20;
    v.y *= 0.85;
    v.z *= 1.30;

    const t = (v.z + 0.28) / 0.56;
    v.y -= 0.06 * t * t;
    v.x += 0.03 * t;

    const wrinkle =
      1.0 +
      0.15 * Math.sin(v.z * 22.0 - v.x * 10.0) +
      0.09 * Math.cos(v.y * 28.0 + v.z * 16.0);

    v.multiplyScalar(wrinkle);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * VesselLumen Component:
 * Renders an open hollow circular vessel lumen matching Cinema 4D medical renders.
 * Features:
 * - Raised arterial/venous vessel wall thickness (RingGeometry)
 * - Recessed dark interior hollow lumen cap (#050102)
 * - Cylindrical interior sleeve lining giving true 3D pipe depth
 */
const VesselLumen: React.FC<{
  position: THREE.Vector3 | [number, number, number];
  direction: THREE.Vector3 | [number, number, number];
  innerRadius: number;
  outerRadius: number;
  depth?: number;
  wallMaterial: THREE.Material;
  capMaterial: THREE.Material;
}> = ({ position, direction, innerRadius, outerRadius, depth = 0.045, wallMaterial, capMaterial }) => {
  const { rimGeo, capGeo, sleeveGeo, posVec, quat, capPos, sleevePos } = useMemo(() => {
    const p = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position);
    const d = (direction instanceof THREE.Vector3 ? direction : new THREE.Vector3(...direction)).clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);

    const rGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    const cGeo = new THREE.CircleGeometry(innerRadius, 32);

    const sGeo = new THREE.CylinderGeometry(innerRadius, innerRadius, depth, 32, 1, true);
    sGeo.rotateX(Math.PI / 2);

    const cPos = p.clone().addScaledVector(d, -depth);
    const sPos = p.clone().addScaledVector(d, -depth / 2);

    return { rimGeo: rGeo, capGeo: cGeo, sleeveGeo: sGeo, posVec: p, quat: q, capPos: cPos, sleevePos: sPos };
  }, [position, direction, innerRadius, outerRadius, depth]);

  return (
    <group>
      <mesh geometry={rimGeo} material={wallMaterial} position={posVec} quaternion={quat} />
      <mesh geometry={capGeo} material={capMaterial} position={capPos} quaternion={quat} />
      <mesh geometry={sleeveGeo} material={capMaterial} position={sleevePos} quaternion={quat} />
    </group>
  );
};

interface ProceduralHeartProps {
  visible?: boolean;
  opacityMultiplier?: number;
  isCutOpenActive?: boolean;
}

const ProceduralHeart: React.FC<ProceduralHeartProps> = ({
  visible = true,
  opacityMultiplier = 1.0,
  isCutOpenActive = true,
}) => {
  const heartOpacity = useStore((state) => state.heartOpacity);
  const showCavities = useStore((state) => state.showCavities);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const isInvertedCut = useStore((state) => state.isInvertedCut);
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

  useEffect(() => {
    invalidate();
  }, [heartOpacity, isCutOpen, dissectionPlane, cutDepth, isInvertedCut, invalidate]);

  // Live cardiac biomechanical animation loop matching physiological Wiggers cycle
  useFrame((state) => {
    const { isBeating, heartRateBpm, beatingSpeed, setCardiacCyclePhase } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    // 1. Ventricular systolic contraction & helical wringing torsion
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
    if (isBeating && lastPhaseRef.current !== motion.phaseName) {
      lastPhaseRef.current = motion.phaseName;
      setCardiacCyclePhase(motion.phaseName);
    }
  });

  // Procedural anatomical textures
  const textures = useMemo(() => createHeartTextures(), []);

  // =========================================================================
  // 1. SCULPTED VENTRICULAR MYOCARDIUM GEOMETRY
  // Conical / pear shape tapering to a rounded apex pointing anterior-inferiorly and to the left
  // Distinct Left Ventricle (thick, dominant) and Right Ventricle (wrapping anteriorly)
  // Deep, natural anterior interventricular sulcus where the LAD lies
  // =========================================================================
  const myocardiumGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 112, 84);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Height parameter t in [0, 1] from inferior (-1) to superior (+1)
      const t = Math.max(0, Math.min(1, (v.y + 1.15) / 2.30));

      // Smooth conical/pear taper toward apex (-y)
      const taper = 0.22 + 0.78 * Math.pow(t, 0.52);
      v.x *= taper;
      v.z *= taper;

      // Left Ventricle (LV) dominance & rounded muscular dome (patient left, x > 0)
      if (v.x > 0) {
        v.x *= 1.22;
        // Rounded muscular fullness
        v.z += 0.07 * Math.sin(t * Math.PI) * Math.min(1.0, v.x / 0.35);
      }

      // Right Ventricle (RV) crescent wrapping around anterior-right (x < 0)
      if (v.x < 0) {
        v.x *= 1.06;

        // Bulge of the pulmonary conus arteriosus (infundibulum) near the base
        if (v.z > 0 && v.y > 0.0) {
          const infundibulum = Math.sin(t * Math.PI) * (1.0 - Math.min(1.0, Math.abs(v.x + 0.26) / 0.32));
          v.z += 0.095 * Math.max(0, infundibulum);
        }

        // Incisura Apicis Cordis: RV terminates before the apex, so LV alone forms apex
        if (v.y < -0.55) {
          const rvApicalNotch = Math.max(0, (v.y + 0.95) / 0.40);
          v.x *= 0.62 + 0.38 * rvApicalNotch;
          v.z *= 0.70 + 0.30 * rvApicalNotch;
        }
      }

      // Anterior Interventricular Sulcus (AIVS): groove where LAD runs
      if (v.z > 0.08) {
        const sulcusX = 0.05 + 0.06 * Math.sin((v.y + 0.3) * 1.6) - 0.03 * (v.y + 0.5);
        const distAIV = Math.abs(v.x - sulcusX);
        if (distAIV < 0.20) {
          const indent = Math.pow(1.0 - distAIV / 0.20, 2) * 0.075;
          v.z -= indent;
        }
      }

      // Posterior Interventricular Sulcus (PIVS): groove on diaphragmatic surface (z < -0.04)
      if (v.z < -0.04) {
        const postSulcusX = 0.04 - 0.02 * (v.y - 0.35);
        const distPIV = Math.abs(v.x - postSulcusX);
        if (distPIV < 0.16) {
          const indent = Math.pow(1.0 - distPIV / 0.16, 2) * 0.055;
          v.z += indent;
        }
      }

      // Deep horizontal Coronary Sulcus (AV groove) separating atria from ventricles
      const distAV = Math.abs(v.y - 0.38);
      if (distAV < 0.14) {
        const avIndent = Math.pow(1.0 - distAV / 0.14, 2) * 0.082;
        v.x *= 1.0 - avIndent;
        v.z *= 1.0 - avIndent;
      }

      // Posterior diaphragmatic surface flattening
      if (v.z < 0) {
        v.z *= 0.82 + 0.08 * Math.max(0, v.y);
      }

      // Realistic Apex: points anatomical left (+X), forward (+Z), and inferior (-Y)
      if (v.y < -0.60) {
        const apexFactor = Math.pow(Math.abs(v.y + 0.60) / 0.55, 1.25);
        v.x += 0.055 * apexFactor;
        v.z += 0.038 * apexFactor;
      }

      // Anatomical vertical elongation along long axis
      v.y *= 1.18;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // =========================================================================
  // 2. SMOOTH SUBEPICARDIAL ADIPOSE FAT CUSHIONS (Refined Organic Bedding)
  // Continuous C1-smooth cushions along anterior IV sulcus and coronary AV groove
  // =========================================================================
  const anteriorFatGeo = useMemo(() => createAnteriorSulcusFatGeometry(), []);
  const coronaryFatGeo = useMemo(() => createCoronarySulcusFatGeometry(), []);

  // =========================================================================
  // 3. GREAT OUTFLOW VESSELS (Aortic Arch & Pulmonary Trunk)
  // With open hollow circular lumens matching Cinema 4D medical renders
  // =========================================================================
  const aorticArchGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.44, 0.12),
      new THREE.Vector3(0.04, 0.76, 0.14),
      new THREE.Vector3(-0.01, 1.10, 0.05),
      new THREE.Vector3(-0.08, 1.16, -0.09),
      new THREE.Vector3(-0.15, 0.98, -0.24),
      new THREE.Vector3(-0.19, 0.60, -0.34),
    ]);
    return new THREE.TubeGeometry(curve, 48, 0.19, 24, false);
  }, []);

  // Three Upright Brachiocephalic Head Branch Arteries
  const archBranches = useMemo(() => {
    // 1. Innominate / Brachiocephalic trunk (largest, on viewer's left / anatomical right)
    const b1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 1.08, 0.08),
      new THREE.Vector3(0.10, 1.26, 0.10),
      new THREE.Vector3(0.14, 1.44, 0.08),
    ]);
    // 2. Left Common Carotid (middle)
    const b2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 1.14, 0.01),
      new THREE.Vector3(0.00, 1.30, 0.00),
      new THREE.Vector3(0.01, 1.46, -0.01),
    ]);
    // 3. Left Subclavian (on viewer's right / anatomical left)
    const b3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, 1.14, -0.07),
      new THREE.Vector3(-0.09, 1.28, -0.09),
      new THREE.Vector3(-0.11, 1.41, -0.10),
    ]);

    return {
      b1: new THREE.TubeGeometry(b1Curve, 20, 0.062, 20, false),
      b2: new THREE.TubeGeometry(b2Curve, 20, 0.050, 18, false),
      b3: new THREE.TubeGeometry(b3Curve, 20, 0.050, 18, false),
    };
  }, []);

  // Pulmonary Trunk: Curving across front of aorta to viewer's right (+X)
  const pulmonaryTrunkGeo = useMemo(() => {
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 0.44, 0.30),
      new THREE.Vector3(-0.10, 0.64, 0.32),
      new THREE.Vector3(0.04, 0.78, 0.26),
      new THREE.Vector3(0.22, 0.84, 0.16),
      new THREE.Vector3(0.38, 0.82, 0.06),
    ]);
    return new THREE.TubeGeometry(trunkCurve, 36, 0.165, 24, false);
  }, []);

  // =========================================================================
  // 4. EPICARDIAL RAISED 3D CORONARY ARTERY TREE (Tapered Caliber)
  // Bright arterial scarlet red (#dc2626) with smooth taper down anterior sulcus
  // =========================================================================
  const epicardialVessels = useMemo(() => {
    // Main LAD Trunk running down anterior interventricular sulcus
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 0.46, 0.42),
      new THREE.Vector3(0.08, 0.26, 0.54),
      new THREE.Vector3(0.10, 0.02, 0.59),
      new THREE.Vector3(0.09, -0.28, 0.56),
      new THREE.Vector3(0.06, -0.60, 0.48),
      new THREE.Vector3(0.03, -0.88, 0.35),
      new THREE.Vector3(0.01, -1.08, 0.18),
    ]);

    // First Diagonal Branch (D1) spreading over LV free wall
    const d1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, 0.20, 0.55),
      new THREE.Vector3(0.22, 0.08, 0.52),
      new THREE.Vector3(0.34, -0.10, 0.44),
      new THREE.Vector3(0.42, -0.30, 0.32),
    ]);

    // D1 Sub-branch
    const d1SubCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.22, 0.08, 0.52),
      new THREE.Vector3(0.28, -0.02, 0.48),
      new THREE.Vector3(0.35, -0.14, 0.38),
    ]);

    // Second Diagonal Branch (D2)
    const d2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.10, -0.12, 0.58),
      new THREE.Vector3(0.19, -0.30, 0.50),
      new THREE.Vector3(0.27, -0.50, 0.39),
      new THREE.Vector3(0.31, -0.70, 0.26),
    ]);

    // Third Apical Diagonal (D3)
    const d3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, -0.46, 0.52),
      new THREE.Vector3(0.16, -0.64, 0.43),
      new THREE.Vector3(0.21, -0.82, 0.30),
    ]);

    // RV Anterior Branches (spreading over right ventricle free wall)
    const rv1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.22, 0.55),
      new THREE.Vector3(-0.08, 0.12, 0.50),
      new THREE.Vector3(-0.22, -0.06, 0.40),
      new THREE.Vector3(-0.32, -0.24, 0.27),
    ]);

    const rv2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, -0.24, 0.57),
      new THREE.Vector3(-0.04, -0.38, 0.48),
      new THREE.Vector3(-0.14, -0.58, 0.36),
    ]);

    const rv3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, -0.58, 0.48),
      new THREE.Vector3(-0.02, -0.74, 0.39),
      new THREE.Vector3(-0.07, -0.90, 0.26),
    ]);

    return {
      lad: createTaperedTubeGeometry(ladCurve, 56, 0.038, 0.014, 16),
      d1: createTaperedTubeGeometry(d1Curve, 28, 0.024, 0.010, 12),
      d1Sub: createTaperedTubeGeometry(d1SubCurve, 20, 0.015, 0.008, 10),
      d2: createTaperedTubeGeometry(d2Curve, 28, 0.020, 0.009, 12),
      d3: createTaperedTubeGeometry(d3Curve, 22, 0.016, 0.008, 10),
      rv1: createTaperedTubeGeometry(rv1Curve, 26, 0.020, 0.009, 12),
      rv2: createTaperedTubeGeometry(rv2Curve, 22, 0.018, 0.008, 10),
      rv3: createTaperedTubeGeometry(rv3Curve, 20, 0.015, 0.007, 10),
    };
  }, []);

  // =========================================================================
  // 5. ATRIA, AURICLES & VENOUS STUBS
  // Left Auricle: Wrinkled anatomical flap tucked under pulmonary trunk on left
  // =========================================================================
  const atriaGeo = useMemo(() => new THREE.SphereGeometry(1.0, 36, 28), []);
  const leftAuricleGeo = useMemo(() => createLeftAuricleGeometry(), []);
  const rightAuricleGeo = useMemo(() => createRightAuricleGeometry(), []);

  // Superior & Inferior Vena Cava (SVC & IVC)
  const svcGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.70, -0.16),
      new THREE.Vector3(-0.37, 1.00, -0.17),
      new THREE.Vector3(-0.36, 1.28, -0.18),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.135, 20, false);
  }, []);

  const ivcGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.34, -0.26),
      new THREE.Vector3(-0.42, 0.16, -0.26),
    ]);
    return new THREE.TubeGeometry(curve, 12, 0.135, 18, false);
  }, []);

  // Pulmonary Vein Stubs on Lateral Margin
  const pvGeoLeftSup = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.38, 0.48, -0.14),
      new THREE.Vector3(0.55, 0.46, -0.08),
    ]);
    return new THREE.TubeGeometry(curve, 14, 0.076, 18, false);
  }, []);

  const pvGeoLeftInf = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.40, 0.30, -0.16),
      new THREE.Vector3(0.56, 0.28, -0.10),
    ]);
    return new THREE.TubeGeometry(curve, 14, 0.074, 18, false);
  }, []);

  const pvGeoRightSup = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.30, 0.54, -0.32),
      new THREE.Vector3(-0.42, 0.54, -0.38),
    ]);
    return new THREE.TubeGeometry(curve, 14, 0.075, 18, false);
  }, []);

  const pvGeoRightInf = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 0.36, -0.30),
      new THREE.Vector3(-0.40, 0.36, -0.36),
    ]);
    return new THREE.TubeGeometry(curve, 14, 0.072, 18, false);
  }, []);

  const effectiveOpacity = (showCavities ? Math.min(heartOpacity, 0.42) : heartOpacity) * opacityMultiplier;
  const isTranslucent = effectiveOpacity < 0.98 || showCavities;
  const isDepthWrite = !showCavities && effectiveOpacity > 0.85;

  // Solid, dense, glistening PBR material with surgical clearcoat
  const myocardiumMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#9c1c2e',
      map: textures?.diffuse ?? null,
      bumpMap: textures?.bump ?? null,
      bumpScale: 0.028,
      roughnessMap: textures?.roughness ?? null,
      roughness: 0.20,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transparent: isTranslucent,
      opacity: effectiveOpacity,
      depthWrite: isDepthWrite,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [textures, effectiveOpacity, isTranslucent, isDepthWrite, clippingPlane]);

  // Soft, glistening amber-yellow adipose tissue material
  const adiposeMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#dfa233', // Glistening golden-amber lipid tone
      roughness: 0.25,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transmission: 0.12,
      ior: 1.45,
      transparent: isTranslucent,
      opacity: effectiveOpacity,
      depthWrite: isDepthWrite,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [effectiveOpacity, isTranslucent, isDepthWrite, clippingPlane]);

  const greatVesselMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#9e1c2e', // Arterial deep crimson
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      transparent: isTranslucent,
      opacity: effectiveOpacity,
      depthWrite: isDepthWrite,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [effectiveOpacity, isTranslucent, isDepthWrite, clippingPlane]);

  const venousMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#3b3750', // Venous deep slate-plum
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
      transparent: isTranslucent,
      opacity: effectiveOpacity,
      depthWrite: isDepthWrite,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: clippingPlane ? THREE.DoubleSide : THREE.FrontSide,
    });
  }, [effectiveOpacity, isTranslucent, isDepthWrite, clippingPlane]);

  const lumenCapMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#050102', // Dark hollow interior lumen cap
      side: THREE.DoubleSide,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
    });
  }, [clippingPlane]);

  const arteryMaterial = useMemo(() => {
    const baseColor = ladColor ?? '#dc2626';
    return new THREE.MeshPhysicalMaterial({
      color: isLadSelected ? '#f87171' : baseColor,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      emissive: isLadSelected ? baseColor : '#000000',
      emissiveIntensity: isLadSelected ? 0.40 : isLadHovered ? 0.20 : 0.0,
      transparent: isTranslucent,
      opacity: effectiveOpacity,
      depthWrite: isDepthWrite,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
    });
  }, [ladColor, isLadSelected, isLadHovered, isTranslucent, effectiveOpacity, isDepthWrite, clippingPlane]);

  return (
    <group name="CardiacAnatomyRoot" visible={visible}>
      {/* ============================================================== */}
      {/* 1. VENTRICULAR MYOCARDIUM BODY, 3D FAT, & EPICARDIAL VESSELS   */}
      {/*    Undergoes inward systolic contraction & apex wringing twist  */}
      {/* ============================================================== */}
      <group ref={ventriclesRef} name="VentricularContractileUnit">
        {/* Sculpted Myocardium Body with Distinct LV & RV Morphology */}
        <mesh
          geometry={myocardiumGeo}
          material={myocardiumMaterial}
          castShadow={false}
          receiveShadow={false}
        />

        {/* 3D Glistening Subepicardial Adipose Fat Cushions (Smooth, organic bedding) */}
        <group name="SubepicardialAdiposeCushions">
          {/* Anterior Interventricular Sulcus Adipose Bed */}
          <mesh geometry={anteriorFatGeo} material={adiposeMaterial} />
          {/* Coronary AV Groove Adipose Collar */}
          <mesh geometry={coronaryFatGeo} material={adiposeMaterial} />
        </group>

        {/* Epicardial Raised 3D Coronary Artery Tree with Smooth Caliber Taper */}
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

        {/* Internal Surgical Dissection Structures (Synchronized sectioning) */}
        {isCutOpen && isCutOpenActive && <InternalHeartStructures />}
      </group>

      {/* ============================================================== */}
      {/* 2. GREAT OUTFLOW VESSELS (Aortic Arch & Pulmonary Trunk)       */}
      {/*    With open hollow circular lumens and dark interior caps     */}
      {/* ============================================================== */}
      <group ref={greatVesselsRef} name="GreatVesselsUnit">
        {/* Aortic Arch */}
        <mesh
          geometry={aorticArchGeo}
          material={greatVesselMaterial}
          castShadow={false}
          receiveShadow={false}
        />

        {/* Descending Aorta Distal Open Hollow Lumen */}
        <VesselLumen
          position={[-0.19, 0.60, -0.34]}
          direction={[-0.10, -0.96, -0.25]}
          innerRadius={0.155}
          outerRadius={0.190}
          depth={0.05}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Branch 1: Brachiocephalic / Innominate Trunk with Hollow Lumen */}
        <mesh geometry={archBranches.b1} material={greatVesselMaterial} />
        <VesselLumen
          position={[0.14, 1.44, 0.08]}
          direction={[0.21, 0.97, -0.11]}
          innerRadius={0.048}
          outerRadius={0.062}
          depth={0.04}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Branch 2: Left Common Carotid with Hollow Lumen */}
        <mesh geometry={archBranches.b2} material={greatVesselMaterial} />
        <VesselLumen
          position={[0.01, 1.46, -0.01]}
          direction={[0.06, 0.99, -0.06]}
          innerRadius={0.038}
          outerRadius={0.050}
          depth={0.04}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Branch 3: Left Subclavian with Hollow Lumen */}
        <mesh geometry={archBranches.b3} material={greatVesselMaterial} />
        <VesselLumen
          position={[-0.11, 1.41, -0.10]}
          direction={[-0.15, 0.98, -0.08]}
          innerRadius={0.038}
          outerRadius={0.050}
          depth={0.04}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Pulmonary Trunk: Arching across front of aorta to viewer's right with Open Hollow Lumen */}
        <mesh geometry={pulmonaryTrunkGeo} material={greatVesselMaterial} />
        <VesselLumen
          position={[0.38, 0.82, 0.06]}
          direction={[0.84, -0.11, -0.53]}
          innerRadius={0.130}
          outerRadius={0.165}
          depth={0.055}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />
      </group>

      {/* ============================================================== */}
      {/* 3. ATRIA, AURICLES, & VENOUS STUBS                             */}
      {/*    Left Auricle tucked under pulmonary trunk on left           */}
      {/* ============================================================== */}
      <group ref={atriaRef} name="AtriaAndAuriclesUnit">
        {/* Right Atrium Body */}
        <mesh
          geometry={atriaGeo}
          material={myocardiumMaterial}
          position={[-0.40, 0.68, -0.12]}
          scale={[0.46, 0.40, 0.40]}
        />

        {/* Right Auricle Draping Over Sulcus */}
        <mesh
          geometry={rightAuricleGeo}
          material={myocardiumMaterial}
          position={[-0.26, 0.58, 0.22]}
          rotation={[-0.30, 0.40, -0.15]}
        />

        {/* Left Atrium Body */}
        <mesh
          geometry={atriaGeo}
          material={myocardiumMaterial}
          position={[0.34, 0.70, -0.20]}
          scale={[0.44, 0.38, 0.38]}
        />

        {/* Left Auricle (appendage): Wrinkled anatomical flap tucked under pulmonary trunk on the left */}
        <mesh
          geometry={leftAuricleGeo}
          material={myocardiumMaterial}
          position={[0.26, 0.52, 0.20]}
          rotation={[0.25, -0.35, 0.20]}
        />

        {/* Superior Vena Cava (SVC) with Open Hollow Circular Lumen */}
        <mesh geometry={svcGeo} material={venousMaterial} />
        <VesselLumen
          position={[-0.36, 1.28, -0.18]}
          direction={[0.03, 0.99, -0.03]}
          innerRadius={0.108}
          outerRadius={0.135}
          depth={0.045}
          wallMaterial={venousMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Inferior Vena Cava (IVC) Stub with Open Hollow Lumen */}
        <mesh geometry={ivcGeo} material={venousMaterial} />
        <VesselLumen
          position={[-0.42, 0.16, -0.26]}
          direction={[0, -1, 0]}
          innerRadius={0.110}
          outerRadius={0.135}
          depth={0.04}
          wallMaterial={venousMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Left Pulmonary Vein Stubs on Lateral Margin with Open Hollow Lumens */}
        <mesh geometry={pvGeoLeftSup} material={greatVesselMaterial} />
        <VesselLumen
          position={[0.55, 0.46, -0.08]}
          direction={[0.94, -0.05, 0.28]}
          innerRadius={0.060}
          outerRadius={0.076}
          depth={0.035}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        <mesh geometry={pvGeoLeftInf} material={greatVesselMaterial} />
        <VesselLumen
          position={[0.56, 0.28, -0.10]}
          direction={[0.94, -0.08, 0.26]}
          innerRadius={0.058}
          outerRadius={0.074}
          depth={0.035}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        {/* Right Pulmonary Vein Stubs on Posterior-Right Margin */}
        <mesh geometry={pvGeoRightSup} material={greatVesselMaterial} />
        <VesselLumen
          position={[-0.42, 0.54, -0.38]}
          direction={[-0.85, 0.0, -0.52]}
          innerRadius={0.060}
          outerRadius={0.075}
          depth={0.035}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />

        <mesh geometry={pvGeoRightInf} material={greatVesselMaterial} />
        <VesselLumen
          position={[-0.40, 0.36, -0.36]}
          direction={[-0.85, 0.0, -0.52]}
          innerRadius={0.058}
          outerRadius={0.072}
          depth={0.035}
          wallMaterial={greatVesselMaterial}
          capMaterial={lumenCapMaterial}
        />
      </group>
    </group>
  );
};

/**
 * Photorealistic Beating Heart Model (beating_heart.glb)
 * Incorporates Cinema 4D reference cardiac motion and anatomical chamber cutaway dissection.
 */
interface RealisticBeatingHeartProps {
  heartOpacity: number;
  isCutOpenActive?: boolean;
  visible?: boolean;
}

const RealisticBeatingHeart: React.FC<RealisticBeatingHeartProps> = ({
  heartOpacity,
  isCutOpenActive = true,
  visible = true,
}) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/beating_heart.glb', '/draco/gltf/');
  const { actions, names } = useAnimations(animations, group);
  const invalidate = useThree((state) => state.invalidate);

  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const isInvertedCut = useStore((state) => state.isInvertedCut);
  const isBeating = useStore((state) => state.isBeating);
  const isPlaying = useStore((state) => state.isPlaying);
  const beatingSpeed = useStore((state) => state.beatingSpeed);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const isAudioMuted = useStore((state) => state.isAudioMuted);
  const showCavities = useStore((state) => state.showCavities);
  const lastSoundRef = useRef<'s1' | 's2' | 'none'>('none');

  // Synchronized surgical clipping plane matching ProceduralHeart & Vessels
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

  // Attach dynamic clipping plane and set DoubleSide when cut open
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            mat.clippingPlanes = clippingPlane ? [clippingPlane] : [];
            mat.clipShadows = true;
            mat.side = isCutOpen ? THREE.DoubleSide : THREE.FrontSide;
            mat.needsUpdate = true;
          });
        }
      }
    });
    invalidate();
  }, [scene, clippingPlane, isCutOpen, invalidate]);

  // Adjust material opacity and transparency based on heartOpacity & showCavities
  useEffect(() => {
    const effectiveOpacity = showCavities ? Math.min(heartOpacity, 0.42) : heartOpacity;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            mat.transparent = effectiveOpacity < 0.98 || showCavities;
            mat.opacity = effectiveOpacity;
            mat.depthWrite = !showCavities && effectiveOpacity > 0.85;
          });
        }
      }
    });
    invalidate();
  }, [scene, heartOpacity, showCavities, invalidate]);

  // Synchronize skeletal animation actions with cardiacPhase, isPlaying, isBeating, and beatingSpeed
  useEffect(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action) {
        const clipDuration = action.getClip().duration || 1.0;
        action.setEffectiveTimeScale(beatingSpeed);

        if (cardiacPhase === 'systole') {
          action.paused = true;
          action.time = clipDuration * 0.25;
        } else if (cardiacPhase === 'diastole') {
          action.paused = true;
          action.time = clipDuration * 0.70;
        } else {
          // Auto beating phase
          if (isPlaying && isBeating) {
            action.paused = false;
            action.play();
          } else {
            action.paused = true;
          }
        }
      }
    }
    invalidate();
  }, [actions, names, isPlaying, isBeating, beatingSpeed, cardiacPhase, invalidate]);

  // Synchronized physiological S1/S2 heart sound playback during auto beating
  useFrame(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action && !action.paused && isPlaying && isBeating && cardiacPhase === 'auto') {
        const clipDuration = action.getClip().duration || 1.0;
        const progress = (action.time % clipDuration) / clipDuration;
        if (progress >= 0.04 && progress <= 0.12 && lastSoundRef.current !== 's1') {
          if (!isAudioMuted) cardiacAudio.playS1();
          lastSoundRef.current = 's1';
        } else if (progress >= 0.36 && progress <= 0.44 && lastSoundRef.current !== 's2') {
          if (!isAudioMuted) cardiacAudio.playS2();
          lastSoundRef.current = 's2';
        } else if (progress > 0.50 && progress < 0.90 && lastSoundRef.current !== 'none') {
          lastSoundRef.current = 'none';
        }
      }
    }
  });

  return (
    <group ref={group} name="RealisticBeatingHeartGLB" visible={visible} dispose={null}>
      <primitive
        object={scene}
        position={[0, -0.83, 0]}
        scale={[10.0, 10.0, 10.0]}
      />
      {isCutOpen && isCutOpenActive && <InternalHeartStructures />}
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
  const viewerMode = useStore((state) => state.viewerMode);
  const heartOpacity = useStore((state) => state.heartOpacity);
  const isCutOpen = useStore((state) => state.isCutOpen);
  const invalidate = useThree((state) => state.invalidate);

  // Transition state: 0.0 = procedural, 1.0 = realistic
  const targetT = viewerMode === 'realistic' ? 1.0 : 0.0;
  const [transitionProgress, setTransitionProgress] = useState<number>(targetT);

  // Smooth 250ms cross-fading between photorealistic and procedural representations
  useEffect(() => {
    const target = viewerMode === 'realistic' ? 1.0 : 0.0;
    if (typeof requestAnimationFrame === 'undefined') {
      setTransitionProgress(target);
      return;
    }

    if (Math.abs(transitionProgress - target) < 0.001) {
      return;
    }

    let animId: number;
    const startT = transitionProgress;
    const startTime = performance.now();
    const durationMs = 250; // Smooth 250ms cross-fade duration

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const nextT = startT + (target - startT) * progress;
      setTransitionProgress(nextT);
      invalidate();

      if (progress < 1.0) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [viewerMode, invalidate]);

  const isRealisticVisible = transitionProgress > 0.001 || viewerMode === 'realistic';
  const isProceduralVisible = transitionProgress < 0.999 || viewerMode === 'procedural';

  const proceduralOpacityMultiplier = Math.max(0, Math.min(1, 1.0 - transitionProgress));
  const realisticHeartOpacity = heartOpacity * Math.max(0, Math.min(1, transitionProgress));

  // Render InternalHeartStructures on active dominant representation to prevent duplicate geometry
  const isRealisticDominant = transitionProgress >= 0.5;

  return (
    <group name="DualRepresentationHeartRoot">
      {/* Procedural Heart Model */}
      <ProceduralHeart
        visible={isProceduralVisible}
        opacityMultiplier={proceduralOpacityMultiplier}
        isCutOpenActive={isCutOpen && !isRealisticDominant}
      />

      {/* Photorealistic Blender Beating Heart Model */}
      <GLTFErrorBoundary
        fallback={
          <ProceduralHeart
            visible={true}
            opacityMultiplier={1.0}
            isCutOpenActive={isCutOpen}
          />
        }
      >
        <Suspense fallback={null}>
          <RealisticBeatingHeart
            visible={isRealisticVisible}
            heartOpacity={realisticHeartOpacity}
            isCutOpenActive={isCutOpen && isRealisticDominant}
          />
        </Suspense>
      </GLTFErrorBoundary>
    </group>
  );
};
