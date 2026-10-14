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
          <ringGeometry args={[0.065, 0.085, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.85} />
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
        <sphereGeometry args={[isSelected ? 0.045 : 0.032, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#fb7185'}
          emissive={isSelected ? '#0284c7' : '#e11d48'}
          emissiveIntensity={isSelected ? 0.85 : 0.45}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.004, 0.002, 0.07, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

function createSpongyMyocardiumTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base fleshy cut muscle coral-crimson matching reference 1308446_o.jpg
  ctx.fillStyle = '#b72f44';
  ctx.fillRect(0, 0, 1024, 1024);

  // Radial / fibrous muscle cut striations
  for (let y = 0; y < 1024; y += 4) {
    const alpha = 0.12 + Math.random() * 0.20;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(248, 160, 172, ${alpha})` : `rgba(105, 16, 28, ${alpha})`;
    ctx.lineWidth = 1.6 + Math.random() * 2.6;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 6);
    ctx.lineTo(1024, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  // Organic porous trabecular pits
  for (let i = 0; i < 950; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 1.5 + Math.random() * 3.8;
    ctx.fillStyle = `rgba(75, 8, 18, ${0.22 + Math.random() * 0.38})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates anatomically authentic spear/claw-shaped fluted valve leaflets matching reference 1308446_o.jpg.
 * Features elongated pointed cusps fanning down into the ventricular cavity where chordae tendineae anchor.
 */
function createSpearClawLeafletGeometry(width = 0.26, height = 0.22, cusps = 4, depthCurve = 0.045) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, -height * 0.22);

  const step = width / cusps;
  // Create distinct spear / claw pointed cusps
  for (let i = cusps - 1; i >= 0; i--) {
    const xMid = -width / 2 + (i + 0.5) * step;
    const xLeft = -width / 2 + i * step;
    const cuspHeight = height * (0.85 + (i % 2 === 0 ? 0.18 : 0.06));

    // Notch taper to spear
    shape.lineTo(xMid + step * 0.26, -height * 0.42);
    // Pointed spear tip
    shape.lineTo(xMid, -cuspHeight);
    // Other side of spear tip
    shape.lineTo(xMid - step * 0.26, -height * 0.42);
    // Inter-cusp valley
    shape.lineTo(xLeft, -height * 0.22);
  }

  shape.lineTo(-width / 2, 0);

  const extrudeSettings = {
    depth: 0.008,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.003,
    bevelThickness: 0.003,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const arch = (1 - Math.min(1, (x / (width / 2)) ** 2)) * depthCurve;
    pos.setZ(i, pos.getZ(i) - arch * Math.abs(y / height));
  }
  geo.computeVertexNormals();
  return geo;
}

export const InternalHeartStructures: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const cutDepth = useStore((state) => state.cutDepth);
  const selectedStructure = useStore((state) => state.selectedInternalStructure);
  const setSelectedStructure = useStore((state) => state.setSelectedInternalStructure);
  const cardiacCyclePhase = useStore((state) => state.cardiacCyclePhase);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const ladProb = useStore((state) => state.prediction.vessels.LAD?.prob ?? 0.5);
  const lcxProb = useStore((state) => state.prediction.vessels.LCX?.prob ?? 0.5);
  const rcaProb = useStore((state) => state.prediction.vessels.RCA?.prob ?? 0.5);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const hoveredVessel = useStore((state) => state.hoveredVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setHoveredVessel = useStore((state) => state.setHoveredVessel);

  const isSystole = cardiacCyclePhase === 'systole' || cardiacCyclePhase === 'isovolumetric';

  // Refs for dynamic 60 FPS cardiac valve and chamber dynamics
  const mitralAntRef = useRef<THREE.Mesh>(null);
  const mitralPostRef = useRef<THREE.Mesh>(null);
  const tricuspidRef = useRef<THREE.Mesh>(null);
  const aorticValveGroupRef = useRef<THREE.Group>(null);
  const papillaryRef1 = useRef<THREE.Mesh>(null);
  const papillaryRef2 = useRef<THREE.Mesh>(null);
  const papillaryRef3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const { isBeating, heartRateBpm, beatingSpeed } = useStore.getState();
    const motion = computeCardiacMotion(state.clock.getElapsedTime(), heartRateBpm, beatingSpeed, isBeating);

    // Dynamic valve leaflet flapping: wide open in diastole, billowed closed in systole
    if (mitralAntRef.current) {
      mitralAntRef.current.rotation.x = motion.valveOpenFactor * 0.40;
    }
    if (mitralPostRef.current) {
      mitralPostRef.current.rotation.x = Math.PI - motion.valveOpenFactor * 0.40;
    }
    if (tricuspidRef.current) {
      tricuspidRef.current.rotation.x = motion.valveOpenFactor * 0.36;
    }
    if (aorticValveGroupRef.current) {
      const open = motion.ejectionPulse * 0.6;
      aorticValveGroupRef.current.scale.set(0.65 + open, 0.65 + open, 0.65 + open);
    }
    if (papillaryRef1.current) {
      papillaryRef1.current.scale.y = 1.0 - motion.contraction * 0.12;
    }
    if (papillaryRef2.current) {
      papillaryRef2.current.scale.y = 1.0 - motion.contraction * 0.12;
    }
    if (papillaryRef3.current) {
      papillaryRef3.current.scale.y = 1.0 - motion.contraction * 0.12;
    }
  });

  const cutZ = useMemo(() => {
    return 0.52 - cutDepth * 0.92;
  }, [cutDepth]);

  const myocardiumTex = useMemo(() => createSpongyMyocardiumTexture(), []);

  const ladColor = useMemo(() => getVesselColorThree(ladProb, colorblindMode), [ladProb, colorblindMode]);
  const lcxColor = useMemo(() => getVesselColorThree(lcxProb, colorblindMode), [lcxProb, colorblindMode]);
  const rcaColor = useMemo(() => getVesselColorThree(rcaProb, colorblindMode), [rcaProb, colorblindMode]);

  // 1. Myocardial Cross-Section Wall Cap (Matching reference image 1308446_o.jpg)
  // Demonstrates thick LV free wall (~11mm) vs thin RV free wall (~4mm) and central IVS
  const cutCapGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.00, -1.08);
    shape.bezierCurveTo(0.22, -1.02, 0.42, -0.88, 0.58, -0.62);
    shape.bezierCurveTo(0.66, -0.30, 0.65, 0.05, 0.48, 0.28);
    shape.bezierCurveTo(0.35, 0.32, 0.05, 0.30, -0.15, 0.28);
    shape.bezierCurveTo(-0.38, 0.26, -0.54, 0.20, -0.68, 0.05);
    shape.bezierCurveTo(-0.78, -0.22, -0.74, -0.52, -0.62, -0.78);
    shape.bezierCurveTo(-0.48, -0.96, -0.22, -1.05, 0.00, -1.08);

    // LV Cavity Window (Thick muscular free wall on screen right per 1308446_o.jpg)
    const lvHole = new THREE.Path();
    lvHole.moveTo(0.10, 0.20);
    lvHole.bezierCurveTo(0.32, 0.18, 0.46, -0.05, 0.46, -0.25);
    lvHole.bezierCurveTo(0.44, -0.55, 0.34, -0.70, 0.22, -0.72);
    lvHole.bezierCurveTo(0.12, -0.70, 0.08, -0.30, 0.08, 0.00);
    lvHole.lineTo(0.10, 0.20);
    shape.holes.push(lvHole);

    // RV Cavity Window (Thin crescent free wall on screen left per 1308446_o.jpg)
    const rvHole = new THREE.Path();
    rvHole.moveTo(-0.10, 0.18);
    rvHole.bezierCurveTo(-0.35, 0.15, -0.55, 0.05, -0.64, -0.20);
    rvHole.bezierCurveTo(-0.62, -0.52, -0.52, -0.68, -0.36, -0.72);
    rvHole.bezierCurveTo(-0.20, -0.70, -0.12, -0.30, -0.10, 0.00);
    rvHole.lineTo(-0.10, 0.18);
    shape.holes.push(rvHole);

    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // 2. Concave Cavity Back Shells (Deep dark burgundy cavern matching 1308446_o.jpg)
  const lvCavityGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.36, 32, 24, 0, Math.PI, 0, Math.PI);
    geo.scale(0.85, 1.45, 0.75);
    return geo;
  }, []);

  const rvCavityGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.38, 32, 24, 0, Math.PI, 0, Math.PI);
    geo.scale(1.05, 1.35, 0.65);
    return geo;
  }, []);

  // 3. IVS Muscular Core
  const septumCoreGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.10, 0.25);
    shape.quadraticCurveTo(0.04, 0.0, 0.08, -0.72);
    shape.lineTo(-0.06, -0.72);
    shape.quadraticCurveTo(-0.12, 0.0, -0.10, 0.25);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // 4. Papillary Muscles
  const papillaryGeo = useMemo(() => {
    return new THREE.ConeGeometry(0.068, 0.28, 16);
  }, []);

  // 5. Authentic Spear/Claw-Shaped Leaflets matching 1308446_o.jpg
  const mitralAnteriorLeafletGeo = useMemo(() => createSpearClawLeafletGeometry(0.26, 0.20, 4, 0.04), []);
  const mitralPosteriorLeafletGeo = useMemo(() => createSpearClawLeafletGeometry(0.22, 0.16, 3, 0.03), []);
  const tricuspidLeafletGeo = useMemo(() => createSpearClawLeafletGeometry(0.24, 0.18, 4, 0.035), []);

  // 6. Branching Chordae Tendineae (Fine fibrous strands anchoring to spear tips)
  const chordaeGeometries = useMemo(() => {
    const curves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.34, -0.26, 0.02),
        new THREE.Vector3(0.32, -0.12, 0.00),
        new THREE.Vector3(0.28, 0.04, -0.04),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.34, -0.26, 0.02),
        new THREE.Vector3(0.36, -0.10, 0.02),
        new THREE.Vector3(0.33, 0.05, -0.02),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.34, -0.26, 0.02),
        new THREE.Vector3(0.26, -0.12, -0.02),
        new THREE.Vector3(0.22, 0.04, -0.05),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, -0.36, -0.10),
        new THREE.Vector3(0.23, -0.15, -0.10),
        new THREE.Vector3(0.25, 0.04, -0.08),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, -0.36, -0.10),
        new THREE.Vector3(0.18, -0.14, -0.07),
        new THREE.Vector3(0.18, 0.05, -0.06),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, -0.30, 0.02),
        new THREE.Vector3(-0.30, -0.12, 0.00),
        new THREE.Vector3(-0.25, 0.04, -0.03),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, -0.30, 0.02),
        new THREE.Vector3(-0.34, -0.10, 0.02),
        new THREE.Vector3(-0.31, 0.04, -0.01),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, -0.28, 0.00),
        new THREE.Vector3(-0.16, -0.12, -0.01),
        new THREE.Vector3(-0.18, 0.04, -0.03),
      ]),
    ];

    return curves.map((curve) => new THREE.TubeGeometry(curve, 18, 0.005, 8, false));
  }, []);

  // 7. Moderator Band
  const moderatorBandGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.10, -0.32, 0.01),
      new THREE.Vector3(-0.24, -0.35, 0.03),
      new THREE.Vector3(-0.36, -0.38, 0.03),
    ]);
    return new THREE.TubeGeometry(curve, 16, 0.026, 8, false);
  }, []);

  // 8. Aortic Cusps
  const aorticCuspGeo = useMemo(() => {
    return new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI, 0, Math.PI / 2);
  }, []);

  // 9. Fossa Ovalis
  const fossaOvalisGeo = useMemo(() => {
    return new THREE.TorusGeometry(0.075, 0.018, 12, 24);
  }, []);

  // 10. Pulmonary Lumen Rings
  const pulmonaryLumenGeos = useMemo(() => {
    return [
      new THREE.CylinderGeometry(0.065, 0.065, 0.08, 24, 1, true),
      new THREE.CylinderGeometry(0.055, 0.055, 0.08, 24, 1, true),
    ];
  }, []);

  // 11. Cutaway Epicardial & Intramyocardial Coronary Arteries (Vivid red LAD running on anterior cut rim)
  const cutVesselGeometries = useMemo(() => {
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.32, 0.09),
      new THREE.Vector3(0.03, 0.16, 0.09),
      new THREE.Vector3(-0.01, -0.15, 0.09),
      new THREE.Vector3(-0.02, -0.50, 0.09),
      new THREE.Vector3(-0.02, -0.85, 0.08),
      new THREE.Vector3(0.00, -1.06, 0.07),
    ]);

    const d1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 0.04, 0.09),
      new THREE.Vector3(0.16, -0.10, 0.09),
      new THREE.Vector3(0.28, -0.28, 0.09),
      new THREE.Vector3(0.36, -0.52, 0.08),
    ]);

    const d2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, -0.25, 0.09),
      new THREE.Vector3(0.08, -0.42, 0.09),
      new THREE.Vector3(0.14, -0.68, 0.08),
    ]);

    const rvBranchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, -0.10, 0.09),
      new THREE.Vector3(-0.14, -0.22, 0.09),
      new THREE.Vector3(-0.28, -0.38, 0.08),
    ]);

    const lcxMarginalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.42, 0.22, 0.07),
      new THREE.Vector3(0.54, 0.00, 0.07),
      new THREE.Vector3(0.56, -0.32, 0.06),
      new THREE.Vector3(0.48, -0.65, 0.05),
    ]);

    const rcaMarginalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.50, 0.18, 0.07),
      new THREE.Vector3(-0.66, -0.05, 0.07),
      new THREE.Vector3(-0.68, -0.35, 0.06),
      new THREE.Vector3(-0.52, -0.68, 0.05),
    ]);

    return {
      lad: new THREE.TubeGeometry(ladCurve, 48, 0.026, 10, false),
      d1: new THREE.TubeGeometry(d1Curve, 24, 0.018, 8, false),
      d2: new THREE.TubeGeometry(d2Curve, 24, 0.015, 8, false),
      rvBranch: new THREE.TubeGeometry(rvBranchCurve, 24, 0.016, 8, false),
      lcxMarginal: new THREE.TubeGeometry(lcxMarginalCurve, 32, 0.022, 8, false),
      rcaMarginal: new THREE.TubeGeometry(rcaMarginalCurve, 32, 0.022, 8, false),
    };
  }, []);

  if (!isCutOpen) return null;

  return (
    <group name="InternalHeartStructuresRoot" position={[0, 0, 0]}>
      {/* 1. Myocardial Cross-Section Wall Cap (Thick LV wall vs thin RV wall per 1308446_o.jpg) */}
      <mesh
        geometry={cutCapGeo}
        position={[0, 0, cutZ - 0.08]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial
          color="#be4151"
          map={myocardiumTex}
          roughness={0.38}
          metalness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Deep Concave Chamber Cavities (Dark burgundy cavern) */}
      <mesh
        geometry={lvCavityGeo}
        position={[0.26, -0.25, cutZ - 0.20]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color="#160205" // Deep dark burgundy cavity matching 1308446_o.jpg
          roughness={0.42}
          metalness={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        geometry={rvCavityGeo}
        position={[-0.36, -0.26, cutZ - 0.18]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color="#1a0408"
          roughness={0.42}
          metalness={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 3. Interventricular Septum 3D Core */}
      <mesh
        geometry={septumCoreGeo}
        position={[0.0, 0.0, cutZ - 0.35]}
      >
        <meshStandardMaterial
          color="#701424"
          roughness={0.36}
          metalness={0.06}
        />
      </mesh>

      {/* 4. Subvalvular Apparatus (Papillary muscles contract with ventricular squeeze) */}
      <mesh
        ref={papillaryRef1}
        geometry={papillaryGeo}
        position={[0.34, -0.36, cutZ - 0.08]}
        rotation={[-0.25, 0, 0.18]}
        scale={[1, isSystole ? 0.9 : 1.05, 1]}
      >
        <meshStandardMaterial color="#94192b" roughness={0.34} metalness={0.06} />
      </mesh>

      <mesh
        ref={papillaryRef2}
        geometry={papillaryGeo}
        position={[0.22, -0.46, cutZ - 0.18]}
        rotation={[0.25, 0, -0.15]}
        scale={[1, isSystole ? 0.9 : 1.05, 1]}
      >
        <meshStandardMaterial color="#881627" roughness={0.34} metalness={0.06} />
      </mesh>

      <mesh
        ref={papillaryRef3}
        geometry={papillaryGeo}
        position={[-0.36, -0.40, cutZ - 0.06]}
        rotation={[-0.2, 0, -0.28]}
        scale={[0.82, 0.82, 0.82]}
      >
        <meshStandardMaterial color="#94192b" roughness={0.34} metalness={0.06} />
      </mesh>

      <mesh geometry={moderatorBandGeo} position={[0, 0, cutZ - 0.08]}>
        <meshStandardMaterial color="#b91c30" roughness={0.32} metalness={0.06} />
      </mesh>

      {/* 5. Branching Chordae Tendineae */}
      {chordaeGeometries.map((geo, idx) => (
        <mesh key={`chordae_${idx}`} geometry={geo} position={[0, 0, cutZ - 0.08]}>
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.20}
            metalness={0.12}
            emissive="#ffffff"
            emissiveIntensity={0.14}
          />
        </mesh>
      ))}

      {/* 6. Authentic Spear-Claw Atrioventricular Valves matching 1308446_o.jpg */}
      <group position={[0.26, 0.14, cutZ - 0.10]} rotation={[0.35, 0.15, 0]}>
        <mesh
          ref={mitralAntRef}
          geometry={mitralAnteriorLeafletGeo}
          position={[0, 0, 0.01]}
          rotation={[0, 0, 0]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.22}
            metalness={0.04}
            transparent={true}
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          ref={mitralPostRef}
          geometry={mitralPosteriorLeafletGeo}
          position={[0, 0, -0.01]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.22}
            metalness={0.04}
            transparent={true}
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <group position={[-0.24, 0.14, cutZ - 0.08]} rotation={[0.25, -0.20, 0]}>
        <mesh
          ref={tricuspidRef}
          geometry={tricuspidLeafletGeo}
          rotation={[0, 0, 0]}
          scale={[0.9, 0.9, 0.9]}
        >
          <meshStandardMaterial
            color="#fff1f2"
            roughness={0.24}
            metalness={0.04}
            transparent={true}
            opacity={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 7. Aortic Semilunar Valve */}
      <group ref={aorticValveGroupRef} position={[0.07, 0.32, cutZ - 0.04]}>
        <mesh geometry={aorticCuspGeo} rotation={[0.3, 0, isSystole ? -0.4 : 0]} scale={[0.65, 0.65, 0.65]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.25} transparent opacity={0.90} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={aorticCuspGeo} rotation={[0.3, (Math.PI * 2) / 3, isSystole ? -0.4 : 0]} scale={[0.65, 0.65, 0.65]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.25} transparent opacity={0.90} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={aorticCuspGeo} rotation={[0.3, (Math.PI * 4) / 3, isSystole ? -0.4 : 0]} scale={[0.65, 0.65, 0.65]}>
          <meshStandardMaterial color="#ffe4e6" roughness={0.25} transparent opacity={0.90} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 8. Fossa Ovalis */}
      <mesh
        geometry={fossaOvalisGeo}
        position={[-0.38, 0.48, cutZ - 0.12]}
        rotation={[0.2, 0.4, 0]}
        scale={[0.7, 0.9, 0.7]}
      >
        <meshStandardMaterial color="#94192b" roughness={0.38} metalness={0.05} />
      </mesh>

      {/* 9. Pulmonary Branch Lumen Rings */}
      <group position={[0.38, 0.18, cutZ + 0.01]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={pulmonaryLumenGeos[0]}>
          <meshStandardMaterial color="#be3e4d" roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <circleGeometry args={[0.063, 24]} />
          <meshBasicMaterial color="#0f0204" side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group position={[0.46, 0.05, cutZ - 0.01]} rotation={[0.1, Math.PI / 2, 0]}>
        <mesh geometry={pulmonaryLumenGeos[1]}>
          <meshStandardMaterial color="#be3e4d" roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <circleGeometry args={[0.053, 24]} />
          <meshBasicMaterial color="#0f0204" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 10. Cutaway Coronary Arteries (Vivid red LAD running on anterior cut rim) */}
      <group position={[0, 0, cutZ - 0.07]}>
        <mesh
          geometry={cutVesselGeometries.lad}
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
            roughness={0.25}
            metalness={0.10}
            emissive={selectedVessel === 'LAD' ? ladColor : '#000000'}
            emissiveIntensity={selectedVessel === 'LAD' ? 0.4 : hoveredVessel === 'LAD' ? 0.2 : 0.0}
          />
        </mesh>

        <mesh geometry={cutVesselGeometries.d1}>
          <meshStandardMaterial color={ladColor} roughness={0.25} metalness={0.10} />
        </mesh>

        <mesh geometry={cutVesselGeometries.d2}>
          <meshStandardMaterial color={ladColor} roughness={0.25} metalness={0.10} />
        </mesh>

        <mesh geometry={cutVesselGeometries.rvBranch}>
          <meshStandardMaterial color={ladColor} roughness={0.25} metalness={0.10} />
        </mesh>

        <mesh
          geometry={cutVesselGeometries.lcxMarginal}
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
            roughness={0.25}
            metalness={0.10}
            emissive={selectedVessel === 'LCX' ? lcxColor : '#000000'}
            emissiveIntensity={selectedVessel === 'LCX' ? 0.4 : hoveredVessel === 'LCX' ? 0.2 : 0.0}
          />
        </mesh>

        <mesh
          geometry={cutVesselGeometries.rcaMarginal}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA', true);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('RCA');
            if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredVessel(null);
            if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
          }}
        >
          <meshStandardMaterial
            color={rcaColor}
            roughness={0.25}
            metalness={0.10}
            emissive={selectedVessel === 'RCA' ? rcaColor : '#000000'}
            emissiveIntensity={selectedVessel === 'RCA' ? 0.4 : hoveredVessel === 'RCA' ? 0.2 : 0.0}
          />
        </mesh>
      </group>

      {/* 11. Interactive Anatomical Pins */}
      {Object.values(INTERNAL_HEART_STRUCTURES).map((item) => (
        <AnatomicalPin
          key={item.id}
          id={item.id}
          name={item.name}
          position={item.position}
          isSelected={selectedStructure === item.id}
          onSelect={(id) => setSelectedStructure(id)}
        />
      ))}
    </group>
  );
};
