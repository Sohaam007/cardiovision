import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

interface RibDefinition {
  index: number;
  yPost: number;
  yAnt: number;
  zSpine: number;
  width: number;
  type: 'true' | 'false' | 'floating';
  sternumY?: number;
  sternumX?: number;
}

const RIB_DEFINITIONS: RibDefinition[] = [
  // 1-7: True Ribs (Vertebrosternal) - articulating with the sternum
  { index: 1, yPost: 0.94, yAnt: 0.84, zSpine: -0.72, width: 0.86, type: 'true', sternumY: 0.84, sternumX: 0.24 },
  { index: 2, yPost: 0.76, yAnt: 0.68, zSpine: -0.73, width: 1.08, type: 'true', sternumY: 0.68, sternumX: 0.18 },
  { index: 3, yPost: 0.58, yAnt: 0.48, zSpine: -0.74, width: 1.24, type: 'true', sternumY: 0.48, sternumX: 0.16 },
  { index: 4, yPost: 0.40, yAnt: 0.28, zSpine: -0.75, width: 1.36, type: 'true', sternumY: 0.28, sternumX: 0.15 },
  { index: 5, yPost: 0.22, yAnt: 0.08, zSpine: -0.76, width: 1.46, type: 'true', sternumY: 0.08, sternumX: 0.15 },
  { index: 6, yPost: 0.04, yAnt: -0.12, zSpine: -0.76, width: 1.52, type: 'true', sternumY: -0.12, sternumX: 0.15 },
  { index: 7, yPost: -0.14, yAnt: -0.32, zSpine: -0.75, width: 1.54, type: 'true', sternumY: -0.32, sternumX: 0.14 },

  // 8-10: False Ribs (Vertebrochondral) - joining the cartilage of the rib above
  { index: 8, yPost: -0.32, yAnt: -0.48, zSpine: -0.74, width: 1.52, type: 'false' },
  { index: 9, yPost: -0.50, yAnt: -0.64, zSpine: -0.73, width: 1.45, type: 'false' },
  { index: 10, yPost: -0.68, yAnt: -0.80, zSpine: -0.72, width: 1.36, type: 'false' },

  // 11-12: Floating Ribs (Vertebral) - tapering freely anteriorly
  { index: 11, yPost: -0.86, yAnt: -0.96, zSpine: -0.71, width: 1.22, type: 'floating' },
  { index: 12, yPost: -1.04, yAnt: -1.12, zSpine: -0.70, width: 1.08, type: 'floating' },
];

export const RibCage: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const isInvertedCut = useStore((state) => state.isInvertedCut);

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

  // Subtle semi-transparent ghosted cortical bone material (opacity: 0.20, depthWrite: false)
  // Provides clean anatomical skeletal context without occluding the internal beating heart or vibrant vascular tree
  const boneMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#d1d9e6', // Subtle ghosted ivory/slate bone hue
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.45,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.20, // 0.18 - 0.24 per reference image & design contract
      depthWrite: false, // Guarantees zero alpha occlusion of beating heart & vasculature inside
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // Subtle ghosted hyaline costal cartilage material (opacity: 0.18, depthWrite: false)
  const cartilageMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#93c5fd', // Hyaline cartilage hue (subtle sky/ice blue tone)
      roughness: 0.22,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.18, // 0.18 - 0.24 per reference image & design contract
      depthWrite: false, // Guarantees zero alpha occlusion
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
  }, [clippingPlane]);

  // =========================================================================
  // 1. 12 PAIRS OF ANATOMICALLY CONTOURED RIB ARCHES
  // =========================================================================
  const ribGeometries = useMemo(() => {
    const ribs: {
      key: string;
      boneRight: THREE.BufferGeometry;
      boneLeft: THREE.BufferGeometry;
      cartilageRight?: THREE.BufferGeometry;
      cartilageLeft?: THREE.BufferGeometry;
    }[] = [];

    RIB_DEFINITIONS.forEach((def) => {
      const W = def.width;
      const yMid = (def.yPost + def.yAnt) * 0.5 - 0.02;
      const ribRadius = def.index === 1 ? 0.034 : 0.026;

      if (def.type === 'true') {
        // True Ribs 1-7: Bony arch sweeps around to costochondral junction
        const ccX = 0.52 * W;
        const ccY = def.yAnt;
        const ccZ = 0.60;

        const bonePointsRight = [
          new THREE.Vector3(0.12, def.yPost, def.zSpine),
          new THREE.Vector3(0.40 * W, def.yPost - 0.03, def.zSpine - 0.07),
          new THREE.Vector3(W, yMid, -0.10),
          new THREE.Vector3(0.85 * W, def.yAnt + 0.04, 0.38),
          new THREE.Vector3(ccX, ccY, ccZ),
        ];

        const boneCurveRight = new THREE.CatmullRomCurve3(bonePointsRight);
        const boneCurveLeft = new THREE.CatmullRomCurve3(
          bonePointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        // Costal Cartilage 1-7: from CC junction directly articulating with the sternum
        const stX = def.sternumX ?? 0.16;
        const stY = def.sternumY ?? def.yAnt;
        const stZ = 0.72;

        const cartPointsRight = [
          new THREE.Vector3(ccX, ccY, ccZ),
          new THREE.Vector3(ccX * 0.65, ccY + (stY - ccY) * 0.45, 0.68),
          new THREE.Vector3(stX, stY, stZ),
        ];

        const cartCurveRight = new THREE.CatmullRomCurve3(cartPointsRight);
        const cartCurveLeft = new THREE.CatmullRomCurve3(
          cartPointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        ribs.push({
          key: `rib_${def.index}`,
          boneRight: new THREE.TubeGeometry(boneCurveRight, 24, ribRadius, 8, false),
          boneLeft: new THREE.TubeGeometry(boneCurveLeft, 24, ribRadius, 8, false),
          cartilageRight: new THREE.TubeGeometry(cartCurveRight, 16, ribRadius * 0.95, 8, false),
          cartilageLeft: new THREE.TubeGeometry(cartCurveLeft, 16, ribRadius * 0.95, 8, false),
        });
      } else if (def.type === 'false') {
        // False Ribs 8-10: Bony arch sweeps forward, cartilage joins cartilage of rib above
        const ccX = 0.58 * W;
        const ccY = def.yAnt;
        const ccZ = 0.54;

        const bonePointsRight = [
          new THREE.Vector3(0.12, def.yPost, def.zSpine),
          new THREE.Vector3(0.42 * W, def.yPost - 0.03, def.zSpine - 0.06),
          new THREE.Vector3(W, yMid, -0.10),
          new THREE.Vector3(0.85 * W, def.yAnt + 0.03, 0.35),
          new THREE.Vector3(ccX, ccY, ccZ),
        ];

        const boneCurveRight = new THREE.CatmullRomCurve3(bonePointsRight);
        const boneCurveLeft = new THREE.CatmullRomCurve3(
          bonePointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        // Costal Cartilage ascending to join cartilage of the rib above
        let targetX = 0.38;
        let targetY = -0.34;
        let targetZ = 0.70;
        if (def.index === 9) {
          targetX = 0.48;
          targetY = -0.44;
          targetZ = 0.66;
        } else if (def.index === 10) {
          targetX = 0.58;
          targetY = -0.56;
          targetZ = 0.62;
        }

        const cartPointsRight = [
          new THREE.Vector3(ccX, ccY, ccZ),
          new THREE.Vector3((ccX + targetX) * 0.5, (ccY + targetY) * 0.5, (ccZ + targetZ) * 0.5),
          new THREE.Vector3(targetX, targetY, targetZ),
        ];

        const cartCurveRight = new THREE.CatmullRomCurve3(cartPointsRight);
        const cartCurveLeft = new THREE.CatmullRomCurve3(
          cartPointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        ribs.push({
          key: `rib_${def.index}`,
          boneRight: new THREE.TubeGeometry(boneCurveRight, 24, ribRadius, 8, false),
          boneLeft: new THREE.TubeGeometry(boneCurveLeft, 24, ribRadius, 8, false),
          cartilageRight: new THREE.TubeGeometry(cartCurveRight, 16, ribRadius * 0.95, 8, false),
          cartilageLeft: new THREE.TubeGeometry(cartCurveLeft, 16, ribRadius * 0.95, 8, false),
        });
      } else {
        // Floating Ribs 11-12: Tapering freely anteriorly
        const endX = def.index === 11 ? 0.96 : 0.82;
        const endY = def.index === 11 ? -0.98 : -1.14;
        const endZ = def.index === 11 ? 0.28 : 0.10;

        const bonePointsRight = [
          new THREE.Vector3(0.12, def.yPost, def.zSpine),
          new THREE.Vector3(0.45 * W, def.yPost - 0.02, def.zSpine - 0.05),
          new THREE.Vector3(W, yMid, -0.12),
          new THREE.Vector3(endX + 0.12, endY + 0.02, endZ - 0.10),
          new THREE.Vector3(endX, endY, endZ),
        ];

        const boneCurveRight = new THREE.CatmullRomCurve3(bonePointsRight);
        const boneCurveLeft = new THREE.CatmullRomCurve3(
          bonePointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        // Free tapered cartilaginous tip
        const tipPointsRight = [
          new THREE.Vector3(endX, endY, endZ),
          new THREE.Vector3(endX - 0.06, endY - 0.01, endZ + 0.06),
        ];
        const tipCurveRight = new THREE.CatmullRomCurve3(tipPointsRight);
        const tipCurveLeft = new THREE.CatmullRomCurve3(
          tipPointsRight.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
        );

        ribs.push({
          key: `rib_${def.index}`,
          boneRight: new THREE.TubeGeometry(boneCurveRight, 20, ribRadius, 8, false),
          boneLeft: new THREE.TubeGeometry(boneCurveLeft, 20, ribRadius, 8, false),
          cartilageRight: new THREE.TubeGeometry(tipCurveRight, 8, ribRadius * 0.85, 6, false),
          cartilageLeft: new THREE.TubeGeometry(tipCurveLeft, 8, ribRadius * 0.85, 6, false),
        });
      }
    });

    return ribs;
  }, []);

  // =========================================================================
  // 2. STERNUM (Manubrium, Gladiolus Body, Xiphoid Process) & CLAVICLES
  // =========================================================================
  const sternumGeos = useMemo(() => {
    // A. Manubrium: Superior broad plate with jugular and clavicular notches
    const manubriumShape = new THREE.Shape();
    manubriumShape.moveTo(0.0, 0.89); // Jugular (suprasternal) notch center dip
    manubriumShape.quadraticCurveTo(0.12, 0.90, 0.22, 0.94); // Right clavicular notch
    manubriumShape.lineTo(0.26, 0.82); // Right lateral margin (Rib 1 facet)
    manubriumShape.lineTo(0.18, 0.69); // Right sternal angle (Rib 2 upper facet)
    manubriumShape.lineTo(-0.18, 0.69); // Left sternal angle
    manubriumShape.lineTo(-0.26, 0.82); // Left lateral margin
    manubriumShape.lineTo(-0.22, 0.94); // Left clavicular notch
    manubriumShape.quadraticCurveTo(-0.12, 0.90, 0.0, 0.89); // Back to center notch

    const manubriumGeo = new THREE.ExtrudeGeometry(manubriumShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    manubriumGeo.center();

    // B. Sternal Body (Gladiolus): elongated flat plate articulating with ribs 2-7
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0.18, 0.69);
    bodyShape.lineTo(0.17, 0.48); // Rib 3 facet
    bodyShape.lineTo(0.16, 0.28); // Rib 4 facet
    bodyShape.lineTo(0.16, 0.08); // Rib 5 facet
    bodyShape.lineTo(0.15, -0.12); // Rib 6 facet
    bodyShape.lineTo(0.14, -0.32); // Rib 7 facet (xiphisternal junction)
    bodyShape.lineTo(-0.14, -0.32);
    bodyShape.lineTo(-0.15, -0.12);
    bodyShape.lineTo(-0.16, 0.08);
    bodyShape.lineTo(-0.16, 0.28);
    bodyShape.lineTo(-0.17, 0.48);
    bodyShape.lineTo(-0.18, 0.69);
    bodyShape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    bodyGeo.center();

    // C. Xiphoid Process: Tapered inferior tip (cartilage)
    const xiphoidShape = new THREE.Shape();
    xiphoidShape.moveTo(0.11, -0.32);
    xiphoidShape.quadraticCurveTo(0.07, -0.42, 0.02, -0.52);
    xiphoidShape.lineTo(-0.02, -0.52);
    xiphoidShape.quadraticCurveTo(-0.07, -0.42, -0.11, -0.32);
    xiphoidShape.closePath();

    const xiphoidGeo = new THREE.ExtrudeGeometry(xiphoidShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
    });
    xiphoidGeo.center();

    // D. Clavicles: Extending laterally toward shoulder joints in an elegant S-curve
    const rightClaviclePoints = [
      new THREE.Vector3(0.22, 0.93, 0.69),
      new THREE.Vector3(0.58, 0.96, 0.72),
      new THREE.Vector3(1.08, 0.99, 0.58),
      new THREE.Vector3(1.50, 1.02, 0.35),
      new THREE.Vector3(1.82, 1.05, 0.12),
    ];
    const rightClavicleCurve = new THREE.CatmullRomCurve3(rightClaviclePoints);
    const leftClavicleCurve = new THREE.CatmullRomCurve3(
      rightClaviclePoints.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
    );

    const rightClavicleGeo = new THREE.TubeGeometry(rightClavicleCurve, 28, 0.038, 10, false);
    const leftClavicleGeo = new THREE.TubeGeometry(leftClavicleCurve, 28, 0.038, 10, false);

    return {
      manubrium: manubriumGeo,
      body: bodyGeo,
      xiphoid: xiphoidGeo,
      rightClavicle: rightClavicleGeo,
      leftClavicle: leftClavicleGeo,
    };
  }, []);

  // =========================================================================
  // 3. THORACIC VERTEBRAL COLUMN (T1 to T12 Posterior Spine)
  // =========================================================================
  const spineGeos = useMemo(() => {
    const vertebrae: { body: THREE.BufferGeometry; spinousProcess: THREE.BufferGeometry; pos: THREE.Vector3 }[] = [];

    for (let i = 0; i < 12; i++) {
      const def = RIB_DEFINITIONS[i];
      const y = def.yPost;
      const z = def.zSpine;

      const bodyGeo = new THREE.CylinderGeometry(0.12, 0.125, 0.13, 16);
      const spinousGeo = new THREE.ConeGeometry(0.045, 0.16, 8);
      spinousGeo.rotateX(Math.PI / 2.0);

      vertebrae.push({
        body: bodyGeo,
        spinousProcess: spinousGeo,
        pos: new THREE.Vector3(0, y, z),
      });
    }

    return vertebrae;
  }, []);

  return (
    <group name="RibCageSystem" position={[0, -0.05, 0]}>
      {/* 1. 12 Pairs of Rib Arches & Costal Cartilages */}
      {ribGeometries.map((rib) => (
        <group key={rib.key}>
          {/* Cortical Bone Arches */}
          <mesh geometry={rib.boneRight} material={boneMaterial} />
          <mesh geometry={rib.boneLeft} material={boneMaterial} />

          {/* Articulating Costal Cartilages */}
          {rib.cartilageRight && <mesh geometry={rib.cartilageRight} material={cartilageMaterial} />}
          {rib.cartilageLeft && <mesh geometry={rib.cartilageLeft} material={cartilageMaterial} />}
        </group>
      ))}

      {/* 2. Sternum Components */}
      {/* Manubrium (centered at y=0.815, z=0.70) */}
      <mesh
        geometry={sternumGeos.manubrium}
        material={boneMaterial}
        position={[0, 0.815, 0.70]}
        rotation={[0.08, 0, 0]}
      />

      {/* Sternal Body / Gladiolus (centered at y=0.185, z=0.72) */}
      <mesh
        geometry={sternumGeos.body}
        material={boneMaterial}
        position={[0, 0.185, 0.72]}
        rotation={[0.05, 0, 0]}
      />

      {/* Xiphoid Process (centered at y=-0.42, z=0.71) */}
      <mesh
        geometry={sternumGeos.xiphoid}
        material={cartilageMaterial}
        position={[0, -0.42, 0.71]}
        rotation={[0.02, 0, 0]}
      />

      {/* Clavicles */}
      <mesh geometry={sternumGeos.rightClavicle} material={boneMaterial} />
      <mesh geometry={sternumGeos.leftClavicle} material={boneMaterial} />

      {/* 3. Posterior Thoracic Vertebrae */}
      {spineGeos.map((vert, idx) => (
        <group key={`vert_${idx}`} position={vert.pos}>
          <mesh geometry={vert.body} material={boneMaterial} />
          <mesh
            geometry={vert.spinousProcess}
            material={boneMaterial}
            position={[0, -0.02, -0.12]}
          />
        </group>
      ))}
    </group>
  );
};
