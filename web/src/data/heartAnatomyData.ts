export interface InternalStructureDetail {
  id: string;
  name: string;
  latinName: string;
  category: 'Chamber' | 'Valve' | 'Septum' | 'Subvalvular' | 'Myocardium';
  position: [number, number, number]; // 3D pin position in scene coordinates
  normalMetrics: {
    dimensions: string;
    pressures: string;
    velocityOrVolume?: string;
  };
  cardiacCycleDynamics: {
    diastole: string;
    isovolumetric: string;
    systole: string;
    relaxation: string;
  };
  coronaryPerfusion: {
    primaryArtery: 'LAD' | 'LCX' | 'RCA' | 'Dual Supply';
    vesselDetails: string;
  };
  clinicalPathology: {
    commonDiseases: string[];
    auscultationOrECG: string;
    surgicalConsiderations: string;
  };
}

export const INTERNAL_HEART_STRUCTURES: Record<string, InternalStructureDetail> = {
  left_ventricle: {
    id: 'left_ventricle',
    name: 'Left Ventricle Cavity & Free Wall',
    latinName: 'Ventriculus sinister',
    category: 'Chamber',
    position: [0.30, -0.25, 0.04],
    normalMetrics: {
      dimensions: 'Diastolic wall thickness: 8–11 mm; Concentric hypertrophy if >12 mm',
      pressures: 'Peak systolic: 100–140 mmHg; End-diastolic (LVEDP): 4–12 mmHg',
      velocityOrVolume: 'EDV: 100–160 mL, ESV: 30–60 mL, Ejection Fraction (LVEF): 55–70%',
    },
    cardiacCycleDynamics: {
      diastole: 'Relaxes rapidly (tau < 45 ms); draws blood from LA under suction gradient; E-wave filling.',
      isovolumetric: 'Steepest dP/dt (>1200 mmHg/s) rise as all valves stay closed; tension escalates across thick wall.',
      systole: 'Radial wall thickening increases by 35–45%; circumferential and longitudinal torsion pump blood into LVOT.',
      relaxation: 'Myocardial strain untwists; pressure precipitously drops from 120 mmHg down to 5 mmHg before mitral opening.',
    },
    coronaryPerfusion: {
      primaryArtery: 'LAD',
      vesselDetails: 'Anterior wall & apex supplied by LAD; lateral wall supplied by LCX obtuse marginals (OM); inferior wall supplied by RCA/PDA.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Anterior Myocardial Infarction (LAD occlusion)',
        'Hypertensive Left Ventricular Hypertrophy (LVH)',
        'Dilated Cardiomyopathy (DCM with reduced EF)',
      ],
      auscultationOrECG: 'ECG shows Sokolow-Lyon criteria (S in V1 + R in V5/V6 > 35 mm) in LVH; Q waves in V1-V4 in anterior STEMI.',
      surgicalConsiderations: 'LV aneurysmectomy (Dor procedure) or LVAD cannulation core directed towards apex without impinging septum.',
    },
  },

  interventricular_septum: {
    id: 'interventricular_septum',
    name: 'Interventricular Septum (IVS)',
    latinName: 'Septum interventriculare',
    category: 'Septum',
    position: [0.00, -0.16, 0.08],
    normalMetrics: {
      dimensions: 'Thickness: 8–11 mm (mid-septal); Membranous portion ~1.5–2.0 mm',
      pressures: 'Trans-septal gradient: ~100 mmHg systolic (120 mmHg LV vs 20 mmHg RV)',
      velocityOrVolume: 'Systolic shortening: >30%; Septal bounce on echo indicates constrictive pericarditis',
    },
    cardiacCycleDynamics: {
      diastole: 'Maintains convex curvature toward the lower-pressure RV chamber; compliant during early filling.',
      isovolumetric: 'Rigid scaffold counterbalancing LV free wall; stabilizes cardiac apex during pressure buildup.',
      systole: 'Contracts synchronously; rotates clockwise ~12° relative to base, delivering blood toward aortic valve.',
      relaxation: 'Untwists, facilitating early diastolic chamber recoil and low-resistance filling.',
    },
    coronaryPerfusion: {
      primaryArtery: 'LAD',
      vesselDetails: 'Anterior 2/3rds perfused by first and second septal perforator branches of the LAD; posterior 1/3rd by the PDA (RCA branch).',
    },
    clinicalPathology: {
      commonDiseases: [
        'Ventricular Septal Defect (VSD - perimembranous / muscular)',
        'Asymmetric Septal Hypertrophy (Hypertrophic Obstructive Cardiomyopathy / HOCM)',
        'Post-infarction Ventricular Septal Rupture (VSR)',
      ],
      auscultationOrECG: 'Harsh, holosystolic crescendo murmur heard loudest at left lower sternal border with thrill.',
      surgicalConsiderations: 'Surgical septal myectomy (Morrow procedure) or alcohol septal ablation for LVOT gradient reduction > 50 mmHg.',
    },
  },

  mitral_valve: {
    id: 'mitral_valve',
    name: 'Mitral (Bicuspid) Valve Complex',
    latinName: 'Valva mitralis / bicuspidalis',
    category: 'Valve',
    position: [0.26, 0.14, -0.04],
    normalMetrics: {
      dimensions: 'Normal orifice area: 4.0–6.0 cm²; Severe stenosis: <1.0 cm²; Annular perimeter: 9–11 cm',
      pressures: 'Diastolic transvalvular gradient: <2 mmHg (normal); >10 mmHg in severe MS',
      velocityOrVolume: 'Peak E-wave velocity: 0.8–1.2 m/s; Deceleration time: 160–220 ms',
    },
    cardiacCycleDynamics: {
      diastole: 'Anterior and posterior leaflets separate widely; rapid laminar blood flow into LV cavity.',
      isovolumetric: 'Leaflet edges coapt abruptly at annulus plane, producing the M1 component of the S1 first heart sound.',
      systole: 'Coaptation zone remains 5–8 mm deep below annulus level, maintained by taut chordae tendineae tension.',
      relaxation: 'Remains closed until LV chamber pressure falls below left atrial pressure (LA pressure ~8–10 mmHg).',
    },
    coronaryPerfusion: {
      primaryArtery: 'Dual Supply',
      vesselDetails: 'Anterior leaflet in fibrous continuity with aortic root; annulus supplied by circumflex artery (LCX) and RCA branch branches.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Mitral Valve Prolapse (Barlow’s disease / Fibroelastic deficiency)',
        'Rheumatic Mitral Stenosis (commissural fusion, hockey-stick anterior leaflet)',
        'Ischemic Functional Mitral Regurgitation (tethering from posterior wall displacement)',
      ],
      auscultationOrECG: 'Midsystolic click and late systolic murmur (MVP); Opening snap and low-pitched rumbling diastolic murmur (MS).',
      surgicalConsiderations: 'Repair preferred over replacement (Carpentier ring annuloplasty, neochordae Gore-Tex placement, MitraClip edge-to-edge).',
    },
  },

  chordae_papillary: {
    id: 'chordae_papillary',
    name: 'Papillary Muscles & Chordae Tendineae',
    latinName: 'Musculi papillares et chordae tendineae',
    category: 'Subvalvular',
    position: [0.34, -0.34, 0.04],
    normalMetrics: {
      dimensions: 'Papillary cross-section: 6–9 mm; Primary chordae diameter: 0.8–1.2 mm; Tensile strength: >25 N',
      pressures: 'Counteracts peak LV intraventricular systolic pressure up to 200 mmHg without elongating',
      velocityOrVolume: 'Zero length extension under physiological loading due to highly aligned type I collagen matrix',
    },
    cardiacCycleDynamics: {
      diastole: 'Papillary muscles relax and descend toward apex; chordae go slack allowing full leaflet excursion.',
      isovolumetric: 'Papillary muscles contract prior to free wall, preemptively tensioning chordae like suspension cables.',
      systole: 'Maintains fixed distance between papillary tips and annulus despite shortening LV long-axis.',
      relaxation: 'Tension releases smoothly in parallel with ventricular untwisting and chamber compliance increase.',
    },
    coronaryPerfusion: {
      primaryArtery: 'Dual Supply',
      vesselDetails: 'Anterolateral papillary muscle has dual supply (LAD diagonal + LCX OM); Posteromedial papillary muscle has vulnerable SINGLE supply (PDA from RCA in 90% or LCX in 10%).',
    },
    clinicalPathology: {
      commonDiseases: [
        'Acute Posteromedial Papillary Muscle Rupture (catastrophic 2-7 days post inferior MI)',
        'Chordal Rupture (acute severe pulmonary edema with flail mitral leaflet)',
        'Papillary Muscle Fibroelastoma / Calcification',
      ],
      auscultationOrECG: 'Sudden onset decrescendo apical systolic murmur with thrill; rapid progression to cardiogenic shock.',
      surgicalConsiderations: 'Emergency surgical mitral valve replacement or urgent papillary muscle re-implantation with pledgeted sutures.',
    },
  },

  aortic_valve: {
    id: 'aortic_valve',
    name: 'Aortic Valve & Sinuses of Valsalva',
    latinName: 'Valva aortae',
    category: 'Valve',
    position: [0.07, 0.32, 0.03],
    normalMetrics: {
      dimensions: 'Normal valve area: 3.0–4.0 cm²; Severe aortic stenosis: <1.0 cm² (index <0.6 cm²/m²)',
      pressures: 'Peak transvalvular systolic gradient: <5 mmHg (normal); >40 mmHg in severe AS; Mean gradient >40 mmHg',
      velocityOrVolume: 'Peak aortic jet velocity: 1.0–1.7 m/s (normal); >4.0 m/s indicates severe aortic stenosis',
    },
    cardiacCycleDynamics: {
      diastole: 'Three semilunar cusps (LCC, RCC, NCC) coapt along central nodule of Arantius; coronaries perfuse during this window.',
      isovolumetric: 'Withstands retroaortic diastolic pressure (80 mmHg) until LV exceeds it.',
      systole: 'Cusps swing outward into sinuses of Valsalva; flow reaches peak acceleration within first 30% of ejection.',
      relaxation: 'Retrograde blood column snaps cusps shut, creating dicrotic notch on arterial line and A2 component of S2.',
    },
    coronaryPerfusion: {
      primaryArtery: 'Dual Supply',
      vesselDetails: 'Left Coronary Sinus gives rise to the Left Main (LM) coronary ostium; Right Coronary Sinus gives rise to the RCA ostium.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Calcific Degenerative Aortic Stenosis (triad: Angina, Syncope, Dyspnea)',
        'Bicuspid Aortic Valve (BAV - congenital, 1-2% population, raphe between cusps)',
        'Aortic Regurgitation (Austin Flint murmur, widened pulse pressure, Corrigan water-hammer pulse)',
      ],
      auscultationOrECG: 'Crescendo-decrescendo harsh systolic ejection murmur radiating to carotids; paradoxical splitting of S2 in severe AS.',
      surgicalConsiderations: 'Transcatheter Aortic Valve Implantation (TAVI/TAVR) or surgical aortic valve replacement (SAVR) indicated when symptomatic or LVEF < 50%.',
    },
  },

  right_ventricle_moderator: {
    id: 'right_ventricle_moderator',
    name: 'Right Ventricle Cavity & Moderator Band',
    latinName: 'Trabecula septomarginalis ventriculi dextri',
    category: 'Chamber',
    position: [-0.24, -0.32, 0.03],
    normalMetrics: {
      dimensions: 'RV free wall thickness: 3–5 mm; RV base diameter: 25–41 mm; TAPSE > 17 mm',
      pressures: 'Systolic: 15–30 mmHg; End-diastolic (RVEDP): 0–8 mmHg',
      velocityOrVolume: 'Pulmonary flow velocity: 0.6–0.9 m/s; RV fractional area change (FAC): >35%',
    },
    cardiacCycleDynamics: {
      diastole: 'Large volume inflow reservoir; expands easily due to high compliance and thin muscular wall.',
      isovolumetric: 'Brief contraction phase; quickly overcomes low pulmonary vascular resistance (PVR ~1-2 Wood units).',
      systole: 'Bellows-like contraction mechanism: longitudinal base-to-apex pull + free wall inward movement.',
      relaxation: 'Rapid pressure drop back to near zero; sensitive to right atrial booster pressure.',
    },
    coronaryPerfusion: {
      primaryArtery: 'RCA',
      vesselDetails: 'RV free wall perfused by acute marginal branches of the RCA; moderator band and anterior wall receive blood from LAD septals.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Right Ventricular Infarction (proximal RCA occlusion; triad of hypotension, clear lung fields, elevated JVP)',
        'Arrhythmogenic Right Ventricular Cardiomyopathy (ARVC - fibrofatty replacement)',
        'Acute Cor Pulmonale (massive saddle pulmonary embolism causing acute RV strain and McConnell sign)',
      ],
      auscultationOrECG: 'Right ventricular heave at parasternal border; ECG shows ST elevation in right-sided leads (V3R, V4R) in RV MI.',
      surgicalConsiderations: 'Avoid volume depletion in RV infarction; RV support via Impella RP or ProtekDuo if refractory shock.',
    },
  },

  tricuspid_valve: {
    id: 'tricuspid_valve',
    name: 'Tricuspid Valve Complex',
    latinName: 'Valva tricuspidalis',
    category: 'Valve',
    position: [-0.22, 0.14, -0.02],
    normalMetrics: {
      dimensions: 'Normal valve area: 7.0–9.0 cm²; Annular diameter: 28–34 mm',
      pressures: 'Normal trans-tricuspid diastolic gradient: <1 mmHg; Regurgitant jet peak gradient: 4v² mmHg',
      velocityOrVolume: 'Peak inflow velocity: 0.3–0.7 m/s; Hepatic vein systolic flow reversal indicates severe TR',
    },
    cardiacCycleDynamics: {
      diastole: 'Three leaflets (Anterior, Posterior, Septal) open during ventricular diastole with respiratory variation.',
      isovolumetric: 'Leaflets coapt softly, producing the T1 component of the S1 first heart sound.',
      systole: 'Tethered by 3 papillary groups preventing regurgitation into right atrium.',
      relaxation: 'Opens when RV pressure dips below RA pressure (~3 mmHg).',
    },
    coronaryPerfusion: {
      primaryArtery: 'RCA',
      vesselDetails: 'Annulus and leaflets supplied by branches of the right coronary artery (RCA) and atrioventricular nodal branch.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Functional / Secondary Tricuspid Regurgitation (annular dilation from pulmonary hypertension / RV enlargement)',
        'Infective Endocarditis (Staphylococcus aureus in IV drug users; large vegetations with septic emboli)',
        'Ebstein’s Anomaly (apical displacement of septal leaflet with atrialization of RV)',
      ],
      auscultationOrECG: 'Pansystolic murmur at left lower sternal border that INCREASES with inspiration (Carvallo’s sign).',
      surgicalConsiderations: 'Tricuspid annuloplasty with rigid/semi-rigid ring indicated during left-sided surgery if annular diameter >= 40 mm.',
    },
  },

  right_atrium_fossa: {
    id: 'right_atrium_fossa',
    name: 'Right Atrium & Fossa Ovalis',
    latinName: 'Atrium dextrum et fossa ovalis',
    category: 'Chamber',
    position: [-0.38, 0.48, -0.04],
    normalMetrics: {
      dimensions: 'RA volume index: <32 mL/m²; Fossa ovalis diameter: 10–18 mm',
      pressures: 'Central venous pressure (CVP): 2–6 mmHg (mean); a-wave: 4–7 mmHg; v-wave: 2–5 mmHg',
      velocityOrVolume: 'Receives SVC, IVC, and Coronary Sinus venous returns (~5 L/min at rest)',
    },
    cardiacCycleDynamics: {
      diastole: 'Late diastole triggers SA-node guided atrial depolarization (P wave) and active atrial booster contraction.',
      isovolumetric: 'Atrium acts as passive reservoir collecting systemic venous return against closed tricuspid valve.',
      systole: 'X-descent occurs as tricuspid ring is pulled downwards by contracting RV, sucking blood into RA.',
      relaxation: 'Y-descent occurs as tricuspid valve opens and blood cascades into the relaxing ventricle.',
    },
    coronaryPerfusion: {
      primaryArtery: 'RCA',
      vesselDetails: 'RA free wall, crista terminalis, and Sinoatrial (SA) node supplied by SA nodal artery (60% RCA, 40% LCX).',
    },
    clinicalPathology: {
      commonDiseases: [
        'Patent Foramen Ovale (PFO - present in 25% of population; paradoxical embolism leading to stroke)',
        'Atrial Septal Defect (ASD - Secundum type most common; ostium primum in Down syndrome)',
        'Atrial Flutter (cavotricuspid isthmus dependent re-entrant macro-circuit with 300 bpm atrial rate)',
      ],
      auscultationOrECG: 'Fixed, wide splitting of S2 in ASD with pulmonary flow systolic ejection murmur; prominent jugular cannon a-waves.',
      surgicalConsiderations: 'Percutaneous catheter closure using Amplatzer occluder device for hemodynamically significant ASD or cryptogenic stroke with high-risk PFO.',
    },
  },

  pulmonary_valve: {
    id: 'pulmonary_valve',
    name: 'Pulmonary (Semilunar) Valve',
    latinName: 'Valva trunci pulmonalis',
    category: 'Valve',
    position: [-0.08, 0.42, 0.12],
    normalMetrics: {
      dimensions: 'Annular diameter: 19–26 mm; Normal orifice area: 3.0–4.0 cm²',
      pressures: 'Systolic transvalvular gradient: <5 mmHg; Peak velocity: 0.6–0.9 m/s',
      velocityOrVolume: 'Normal pulmonary stroke volume matching systemic cardiac output (~5 L/min)',
    },
    cardiacCycleDynamics: {
      diastole: 'Three semilunar cusps coapt tightly, preventing retrograde blood leakage from pulmonary trunk into RV.',
      isovolumetric: 'Withstands pulmonary artery diastolic pressure (~10–15 mmHg) until RV pressure exceeds it.',
      systole: 'Cusps swing open into pulmonary trunk outflow during right ventricular ejection.',
      relaxation: 'Snaps shut abruptly as RV pressure drops below PA pressure, forming P2 component of S2 sound.',
    },
    coronaryPerfusion: {
      primaryArtery: 'Dual Supply',
      vesselDetails: 'Infundibulum and annulus perfused by conus branch of the RCA and proximal septal/diagonal branches of LAD.',
    },
    clinicalPathology: {
      commonDiseases: [
        'Pulmonary Valve Stenosis (congenital, Tetralogy of Fallot, Noonan syndrome)',
        'Pulmonary Regurgitation (secondary to severe pulmonary hypertension or post-repair)',
        'Carcinoid Heart Disease (fibrous plaquing and cusp retraction)',
      ],
      auscultationOrECG: 'Crescendo-decrescendo harsh systolic ejection murmur at left second intercostal space; delayed P2.',
      surgicalConsiderations: 'Balloon pulmonary valvuloplasty (BPV) for isolated PS; Melody or Sapien transcatheter pulmonary valve replacement (TPVR).',
    },
  },

  left_atrium: {
    id: 'left_atrium',
    name: 'Left Atrium & Auricle (Appendage)',
    latinName: 'Atrium sinistrum et auricula',
    category: 'Chamber',
    position: [0.36, 0.52, -0.05],
    normalMetrics: {
      dimensions: 'LA volume index (LAVI): <34 mL/m²; LA anteroposterior diameter: 27–40 mm',
      pressures: 'Mean left atrial pressure (LAP) / PCWP: 4–12 mmHg; v-wave: 6–15 mmHg',
      velocityOrVolume: 'Receives 4 pulmonary veins; LAA emptying flow velocity: >40 cm/s',
    },
    cardiacCycleDynamics: {
      diastole: 'Acts as conduit during early filling, then active booster pump during late diastole (atrial kick ~20% of EDV).',
      isovolumetric: 'Passive low-pressure reservoir receiving oxygenated pulmonary venous return from all 4 veins.',
      systole: 'Chamber expands to store pulmonary venous inflow while mitral valve is closed.',
      relaxation: 'Compliant relaxation accommodates incoming blood column before next early diastolic opening.',
    },
    coronaryPerfusion: {
      primaryArtery: 'LCX',
      vesselDetails: 'Perfused primarily by circumflex artery (LCX) atrial branches and sinus nodal branch (in 40% of patients).',
    },
    clinicalPathology: {
      commonDiseases: [
        'Atrial Fibrillation (arrhythmogenic triggers located at pulmonary vein myocardial sleeves)',
        'Left Atrial Appendage Thrombus (cause of 90%+ of cardiogenic ischemic strokes in non-valvular AF)',
        'Left Atrial Dilation / Myxoma (most common primary intracardiac benign neoplasm)',
      ],
      auscultationOrECG: 'Broad bifid P-wave in lead II (>120 ms) with biphasic terminal negativity in V1 (P-mitrale) in LA enlargement.',
      surgicalConsiderations: 'Percutaneous LAA occlusion (Watchman FLX / Amulet) to prevent stroke without oral anticoagulation; surgical Cox-Maze IV ablation.',
    },
  },
};
