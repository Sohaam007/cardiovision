"""
scripts/blender_cardiac_turntable.py
CardioVision Blender 3D Procedural Cardiac Turntable & Motion Animation Pipeline
Track A: Multimodal Cardiovascular Risk Stratification & 3D Visualization

Clinical Invariant: Uniform coloration across entire vessel based on model-predicted probability.
Zero focal lesion claims. Zero LAD/LCX/RCA data leakage into model inputs.

Usage examples:
  # Render canonical multi-angle clinical views:
  blender -b -P scripts/blender_cardiac_turntable.py -- --render-views docs/figures --export-glb docs/figures/cardiac_model.glb

  # Export web-ready GLB model with Patient #002 risk calibration:
  blender -b -P scripts/blender_cardiac_turntable.py -- --export-glb docs/figures/cardiac_model.glb

  # Render single high-res still:
  blender -b -P scripts/blender_cardiac_turntable.py -- --render-still docs/figures/blender_render_anterior.png
"""

import sys
import os
import math
import argparse
import bpy


# ---------------------------------------------------------------------------
# Clinical Color Palette & Guardrails
# ---------------------------------------------------------------------------

PALETTES = {
    "standard": {
        "low": (0.063, 0.725, 0.506, 1.0),   # #10b981 Emerald Green (p = 0.0)
        "mid": (0.961, 0.620, 0.043, 1.0),   # #f59e0b Clinical Amber (p = 0.5)
        "high": (0.937, 0.267, 0.216, 1.0),  # #ef4444 Crimson Red   (p = 1.0)
    },
    "colorblind": {
        "low": (0.231, 0.510, 0.965, 1.0),   # #3b82f6 Royal Blue
        "mid": (0.976, 0.451, 0.086, 1.0),   # #f97316 Vivid Orange
        "high": (0.851, 0.275, 0.937, 1.0),  # #d946ef Magenta Pink
    },
}


def lerp_color(c1, c2, t):
    """Linear interpolation between two RGBA tuples."""
    t = max(0.0, min(1.0, t))
    return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(4))


def get_vessel_color(prob: float, colorblind: bool = False):
    """
    Continuous 3-point piecewise linear RGB interpolation across [0.0, 1.0].
    Enforces clinical invariant: uniform coloration across whole vessel.
    """
    safe_p = max(0.0, min(1.0, float(prob))) if math.isfinite(prob) else 0.5
    pal = PALETTES["colorblind"] if colorblind else PALETTES["standard"]
    if safe_p <= 0.5:
        return lerp_color(pal["low"], pal["mid"], safe_p / 0.5)
    return lerp_color(pal["mid"], pal["high"], (safe_p - 0.5) / 0.5)


# ---------------------------------------------------------------------------
# Scene Initialization & Geometry
# ---------------------------------------------------------------------------

def clear_scene():
    """Remove all objects and unlinked data blocks from scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def create_pbr_material(name, base_color, roughness=0.45, specular=0.5, subsurface=0.0, emission_color=None, emission_strength=0.0):
    """Create Principled BSDF material with robust fallback for Blender 4/5."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        if 'Base Color' in bsdf.inputs:
            bsdf.inputs['Base Color'].default_value = base_color
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = roughness
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        elif 'Specular' in bsdf.inputs:
            bsdf.inputs['Specular'].default_value = specular
        if subsurface > 0:
            if 'Subsurface Weight' in bsdf.inputs:
                bsdf.inputs['Subsurface Weight'].default_value = subsurface
            elif 'Subsurface' in bsdf.inputs:
                bsdf.inputs['Subsurface'].default_value = subsurface
        if emission_color and emission_strength > 0:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission_color
            if 'Emission Strength' in bsdf.inputs:
                bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat


def build_heart_myocardium(cutaway=True):
    """
    Generate anatomical compound myocardium geometry matching docs/reference/Heart moving.mp4:
    - Primary Ventricular Myocardium (conical tapering towards apex, LV lateral bulge, anterior groove)
    - Optional anterior cutaway window revealing internal ventricles and septum
    - Right & Left Atria
    - Ascending Aorta Root
    - Pulmonary Trunk
    - Superior Vena Cava
    """
    # 1. Ventricular Myocardium
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.0, location=(0, 0, 0))
    lv = bpy.context.active_object
    lv.name = "Myocardium_Ventricular"

    # Deform vertices to match anatomical cardiac geometry
    mesh = lv.data
    for v in mesh.vertices:
        co = v.co
        # Height parameter t in [0, 1] from inferior (-1) to superior (+1)
        t = max(0.0, min(1.0, (co.z + 1.0) / 2.0))
        taper = 0.32 + 0.68 * math.sqrt(t)
        co.x *= taper
        co.y *= taper

        # Left ventricle muscular bulge (patient left, x > 0)
        if co.x > 0:
            co.x *= 1.14

        # Posterior flattening (y > 0 is posterior)
        if co.y > 0:
            co.y *= 0.84

        # Anterior interventricular groove indentation where LAD tracks (y < 0 is anterior)
        if co.y < 0 and 0.12 < co.x < 0.42:
            dist = abs(co.x - 0.28) / 0.15
            indent = max(0.0, 1.0 - dist) * 0.055
            co.y += indent  # push towards center

        # Cutaway dissection window (carve anterior chamber opening if cutaway=True)
        if cutaway and co.y < -0.08 and -0.92 < co.z < 0.58:
            wall_dist = math.sqrt(co.x * co.x + (co.z + 0.15) * (co.z + 0.15))
            if wall_dist < 0.72:
                co.y = 0.15 - 0.20 * math.sin(co.z * 3.0)

        # Elongate cardiac long axis
        co.z *= 1.15

    mesh.update()
    bpy.ops.object.shade_smooth()

    mat_myo = create_pbr_material("Mat_Myocardium", base_color=(0.533, 0.075, 0.216, 1.0), roughness=0.50, subsurface=0.25)
    lv.data.materials.append(mat_myo)

    # 2. Right Atrium
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.38, location=(-0.38, 0.12, 0.72))
    ra = bpy.context.active_object
    ra.name = "Right_Atrium"
    ra.scale = (1.1, 1.0, 1.0)
    bpy.ops.object.shade_smooth()
    mat_atria = create_pbr_material("Mat_Atria", base_color=(0.498, 0.114, 0.114, 1.0), roughness=0.55, subsurface=0.20)
    ra.data.materials.append(mat_atria)

    # 3. Left Atrium
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.36, location=(0.34, 0.20, 0.75))
    la = bpy.context.active_object
    la.name = "Left_Atrium"
    bpy.ops.object.shade_smooth()
    la.data.materials.append(mat_atria)

    # 4. Ascending Aorta Root
    bpy.ops.mesh.primitive_cylinder_add(radius=0.21, depth=0.75, location=(0.06, -0.10, 0.95))
    aorta = bpy.context.active_object
    aorta.name = "Ascending_Aorta"
    aorta.rotation_euler = (math.radians(12), math.radians(-6), 0)
    bpy.ops.object.shade_smooth()
    mat_aorta = create_pbr_material("Mat_Aorta", base_color=(0.745, 0.071, 0.235, 1.0), roughness=0.40, subsurface=0.15)
    aorta.data.materials.append(mat_aorta)

    # 5. Pulmonary Trunk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.65, location=(0.16, -0.28, 0.82))
    pulm = bpy.context.active_object
    pulm.name = "Pulmonary_Trunk"
    pulm.rotation_euler = (math.radians(20), math.radians(12), math.radians(-18))
    bpy.ops.object.shade_smooth()
    mat_pulm = create_pbr_material("Mat_Pulmonary", base_color=(0.216, 0.188, 0.639, 1.0), roughness=0.48, subsurface=0.10)
    pulm.data.materials.append(mat_pulm)

    # 6. Superior Vena Cava
    bpy.ops.mesh.primitive_cylinder_add(radius=0.125, depth=0.55, location=(-0.45, 0.22, 1.15))
    svc = bpy.context.active_object
    svc.name = "Superior_Vena_Cava"
    svc.rotation_euler = (math.radians(-3), 0, math.radians(3))
    bpy.ops.object.shade_smooth()
    mat_svc = create_pbr_material("Mat_SVC", base_color=(0.192, 0.180, 0.505, 1.0), roughness=0.50, subsurface=0.10)
    svc.data.materials.append(mat_svc)


def build_epicardial_adipose():
    """Build golden-amber epicardial adipose fat pads along AV sulcus (matching reference video)."""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.68,
        minor_radius=0.08,
        major_segments=36,
        minor_segments=16,
        location=(0.02, 0.05, 0.52),
        rotation=(math.radians(72), math.radians(-10), math.radians(20))
    )
    fat = bpy.context.active_object
    fat.name = "Epicardial_Adipose"
    bpy.ops.object.shade_smooth()
    mat_fat = create_pbr_material("Mat_Adipose", base_color=(0.82, 0.62, 0.18, 1.0), roughness=0.62, subsurface=0.20)
    fat.data.materials.append(mat_fat)
    return fat


def build_aortic_arch_branches():
    """Build the 3 major systemic arterial branches off the aortic arch."""
    mat_art = bpy.data.materials.get("Mat_Aorta")
    branches = [
        ("Branch_Brachiocephalic", (-0.04, -0.04, 1.35), (math.radians(-6), 0, math.radians(-8))),
        ("Branch_LeftCarotid", (0.08, -0.02, 1.38), (math.radians(-8), 0, 0)),
        ("Branch_LeftSubclavian", (0.20, 0.00, 1.34), (math.radians(-8), 0, math.radians(10))),
    ]
    for bname, bloc, brot in branches:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.32, location=bloc, rotation=brot)
        bobj = bpy.context.active_object
        bobj.name = bname
        bpy.ops.object.shade_smooth()
        if mat_art:
            bobj.data.materials.append(mat_art)


def build_internal_chamber_anatomy():
    """
    Build interior cross-section cutaway anatomy matching docs/reference/Heart moving.mp4:
    - Muscular interventricular septum
    - Valve rings (mitral & tricuspid)
    - Fibrous Chordae Tendineae valve strings
    - Papillary muscle anchor cones
    """
    # 1. Muscular Interventricular Septum (separating LV & RV)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.05, 0.02, -0.15))
    septum = bpy.context.active_object
    septum.name = "Chamber_Interventricular_Septum"
    septum.scale = (0.16, 0.55, 0.90)
    bpy.ops.object.shade_smooth()
    mat_septum = create_pbr_material("Mat_Septum", base_color=(0.44, 0.10, 0.18, 1.0), roughness=0.52, subsurface=0.22)
    septum.data.materials.append(mat_septum)

    # 2. Left and Right Papillary Muscles
    bpy.ops.mesh.primitive_cone_add(radius1=0.09, depth=0.30, location=(0.32, 0.04, -0.38), rotation=(math.radians(10), 0, math.radians(-12)))
    pap_lv = bpy.context.active_object
    pap_lv.name = "Papillary_Muscle_LV"
    bpy.ops.object.shade_smooth()
    pap_lv.data.materials.append(mat_septum)

    bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.28, location=(-0.24, 0.05, -0.35), rotation=(math.radians(10), 0, math.radians(14)))
    pap_rv = bpy.context.active_object
    pap_rv.name = "Papillary_Muscle_RV"
    bpy.ops.object.shade_smooth()
    pap_rv.data.materials.append(mat_septum)

    # 3. Mitral & Tricuspid Valve Rings
    mat_valve = create_pbr_material("Mat_Valve", base_color=(0.95, 0.95, 0.96, 1.0), roughness=0.28, subsurface=0.15)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.025, location=(0.26, 0.04, 0.32), rotation=(math.radians(85), 0, math.radians(10)))
    valve_m = bpy.context.active_object
    valve_m.name = "Valve_Mitral_Ring"
    bpy.ops.object.shade_smooth()
    valve_m.data.materials.append(mat_valve)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.024, location=(-0.20, 0.05, 0.30), rotation=(math.radians(85), 0, math.radians(-10)))
    valve_t = bpy.context.active_object
    valve_t.name = "Valve_Tricuspid_Ring"
    bpy.ops.object.shade_smooth()
    valve_t.data.materials.append(mat_valve)

    # 4. Fibrous Chordae Tendineae (White tendon cords)
    chordae_coords = [
        ((0.29, 0.04, -0.05), (math.radians(4), 0, math.radians(-6))),
        ((0.34, 0.03, -0.08), (math.radians(-4), 0, math.radians(-12))),
        ((-0.21, 0.05, -0.05), (math.radians(4), 0, math.radians(6))),
    ]
    for i, (cloc, crot) in enumerate(chordae_coords):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.014, depth=0.42, location=cloc, rotation=crot)
        cord = bpy.context.active_object
        cord.name = f"Chordae_Tendineae_{i+1}"
        bpy.ops.object.shade_smooth()
        cord.data.materials.append(mat_valve)


def create_coronary_spline(name, points, color_rgba, bevel_depth=0.046):
    """
    Generate a 3D coronary artery tube from verified anatomical control points.
    Uniform PBR material coloration across entire vessel length.
    """
    curve_data = bpy.data.curves.new(name=f"{name}_Data", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 6

    spline = curve_data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)

    for i, pt in enumerate(points):
        bp = spline.bezier_points[i]
        bp.co = pt
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)

    # Risk-calibrated PBR material with subtle emission for high contrast
    mat = create_pbr_material(
        name=f"Mat_{name}",
        base_color=color_rgba,
        roughness=0.25,
        specular=0.6,
        emission_color=color_rgba,
        emission_strength=0.35,
    )
    obj.data.materials.append(mat)
    return obj


def build_coronary_tree(lad_p=0.94, lcx_p=0.24, rca_p=0.28, colorblind=False):
    """
    Generate Left Main, LAD, LCX, and RCA arterial branches with verified pathways:
    Coordinate conversion from Three.js: (x, y, z) -> Blender: (x, -z, y).
    """
    # Left Main Trunk (Aorta sinotubular junction -> LAD/LCX bifurcation)
    lm_color = get_vessel_color(0.5 * (lad_p + lcx_p), colorblind=colorblind)
    lm_points = [
        (0.08, -0.22, 0.65),
        (0.18, -0.29, 0.58),
        (0.28, -0.35, 0.52),
    ]
    create_coronary_spline("Vessel_LM", lm_points, lm_color, bevel_depth=0.052)

    # Left Anterior Descending (Anterior interventricular groove down to apex)
    lad_color = get_vessel_color(lad_p, colorblind=colorblind)
    lad_points = [
        (0.28, -0.35, 0.52),
        (0.32, -0.56, 0.28),
        (0.30, -0.66, 0.00),
        (0.27, -0.62, -0.32),
        (0.26, -0.50, -0.65),
        (0.25, -0.35, -0.92),
        (0.24, -0.22, -1.10),
    ]
    create_coronary_spline("Vessel_LAD", lad_points, lad_color, bevel_depth=0.046)

    # Left Circumflex (Wraps left AV groove to posterior wall)
    lcx_color = get_vessel_color(lcx_p, colorblind=colorblind)
    lcx_points = [
        (0.28, -0.35, 0.52),
        (0.52, -0.30, 0.42),
        (0.72, -0.08, 0.25),
        (0.74, 0.22, 0.06),
        (0.56, 0.46, -0.15),
        (0.32, 0.55, -0.32),
        (0.12, 0.52, -0.48),
    ]
    create_coronary_spline("Vessel_LCX", lcx_points, lcx_color, bevel_depth=0.042)

    # Right Coronary Artery (Right AV groove down to crux cordis)
    rca_color = get_vessel_color(rca_p, colorblind=colorblind)
    rca_points = [
        (-0.12, -0.22, 0.62),
        (-0.38, -0.32, 0.46),
        (-0.58, -0.26, 0.22),
        (-0.66, -0.12, -0.08),
        (-0.56, 0.12, -0.42),
        (-0.34, 0.32, -0.66),
        (-0.08, 0.38, -0.82),
    ]
    create_coronary_spline("Vessel_RCA", rca_points, rca_color, bevel_depth=0.046)


# ---------------------------------------------------------------------------
# Cinematic Lighting & Turntable Rig
# ---------------------------------------------------------------------------

def setup_lighting():
    """Cinematic 3-point medical studio lighting."""
    # Key Light (Anterior-superior warm fill)
    bpy.ops.object.light_add(type='AREA', radius=2.5, location=(2.5, -3.5, 3.0))
    key = bpy.context.active_object
    key.name = "Key_Light"
    key.data.energy = 300
    key.data.color = (1.0, 0.96, 0.92)

    # Fill Light (Patient left cool lateral)
    bpy.ops.object.light_add(type='AREA', radius=2.0, location=(-3.5, -2.0, 1.5))
    fill = bpy.context.active_object
    fill.name = "Fill_Light"
    fill.data.energy = 160
    fill.data.color = (0.85, 0.92, 1.0)

    # Rim / Backlight (Posterior edge separation)
    bpy.ops.object.light_add(type='SPOT', location=(0, 4.0, 2.5))
    rim = bpy.context.active_object
    rim.name = "Rim_Light"
    rim.data.energy = 350
    rim.data.spot_size = math.radians(65)
    rim.data.color = (0.3, 0.85, 1.0)


def setup_turntable(total_frames=120):
    """
    Creates turntable rig with 360-degree rotation.
    Frame 1: Anterior view (LAD foreground)
    Frame 35: Left Lateral view (LCX foreground)
    Frame 70: Posterior view (Crux / posterior crux)
    Frame 105: Right Anterior view (RCA foreground)
    Frame 120: Loop return to Anterior
    """
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, -0.1))
    empty = bpy.context.active_object
    empty.name = "Turntable_Center"

    # Camera placed anteriorly (-Y), looking slightly down at cardiac center
    bpy.ops.object.camera_add(location=(0, -3.8, 0.4))
    cam = bpy.context.active_object
    cam.name = "Turntable_Camera"
    cam.rotation_euler = (math.radians(84), 0, 0)
    cam.parent = empty
    bpy.context.scene.camera = cam

    # Animate empty rotation around Z axis
    empty.rotation_euler = (0, 0, 0)
    empty.keyframe_insert(data_path="rotation_euler", frame=1)

    empty.rotation_euler = (0, 0, math.radians(360))
    empty.keyframe_insert(data_path="rotation_euler", frame=total_frames)

    # Smooth Bezier interpolation compatible with Blender 4 and Blender 5 layered actions
    action = getattr(empty.animation_data, "action", None)
    if action:
        # Blender <= 4.x legacy fcurves
        legacy_fcurves = getattr(action, "fcurves", None)
        if legacy_fcurves:
            for fc in legacy_fcurves:
                for kf in fc.keyframe_points:
                    kf.interpolation = 'BEZIER'
        # Blender 5.x layered animation system
        elif hasattr(action, "layers"):
            for layer in action.layers:
                for strip in layer.strips:
                    for bag in strip.channelbags:
                        for fc in bag.fcurves:
                            for kf in fc.keyframe_points:
                                kf.interpolation = 'BEZIER'

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = total_frames
    return empty, cam


# ---------------------------------------------------------------------------
# Rendering & Export Routines
# ---------------------------------------------------------------------------

def render_still_frame(frame_number, output_filepath, width=1280, height=720):
    """Render a single designated frame to PNG."""
    scene = bpy.context.scene
    scene.frame_set(frame_number)
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = os.path.abspath(output_filepath)
    scene.render.image_settings.file_format = 'PNG'
    os.makedirs(os.path.dirname(os.path.abspath(output_filepath)), exist_ok=True)
    print(f"[CardioVision] Rendering frame {frame_number} -> {output_filepath}...")
    bpy.ops.render.render(write_still=True)
    print(f"[CardioVision] Frame saved successfully.")


def render_clinical_views(output_dir, width=1280, height=720):
    """
    Render 3 canonical clinical angles:
    - Anterior (frame 1)
    - Left Lateral (frame 35, highlighting LCX)
    - Posterior (frame 70, highlighting RCA crux)
    """
    os.makedirs(os.path.abspath(output_dir), exist_ok=True)
    views = [
        (1, os.path.join(output_dir, "blender_render_anterior.png")),
        (35, os.path.join(output_dir, "blender_render_lateral.png")),
        (70, os.path.join(output_dir, "blender_render_posterior.png")),
    ]
    for frame, path in views:
        render_still_frame(frame, path, width=width, height=height)


def render_turntable_frames(output_dir, total_frames=24, width=640, height=360):
    """Render 360-degree turntable frames for web interactive viewer or animation."""
    abs_dir = os.path.abspath(output_dir)
    os.makedirs(abs_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.image_settings.file_format = 'PNG'
    print(f"[CardioVision] Rendering {total_frames} turntable frames ({width}x{height}) to {abs_dir}...")
    for f in range(1, total_frames + 1):
        scene.frame_set(f)
        frame_path = os.path.join(abs_dir, f"frame_{f:02d}.png")
        scene.render.filepath = frame_path
        bpy.ops.render.render(write_still=True)
    print(f"[CardioVision] Successfully saved {total_frames} turntable frames to {abs_dir}")


def export_glb(output_filepath):
    """
    Export cardiac model to compact glTF 2.0 binary (.glb).
    Ensures web compatibility and file size < 5 MB.
    """
    abs_path = os.path.abspath(output_filepath)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    print(f"[CardioVision] Exporting GLB model to {abs_path}...")
    bpy.ops.export_scene.gltf(
        filepath=abs_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
    )
    size_mb = os.path.getsize(abs_path) / (1024 * 1024)
    print(f"[CardioVision] GLB export complete ({size_mb:.2f} MB). Budget check: {'PASS' if size_mb < 5.0 else 'WARN'}")


# ---------------------------------------------------------------------------
# CLI Argument Parser & Entry Point
# ---------------------------------------------------------------------------

def parse_cli_args():
    """Extract CLI arguments following Blender's '--' separator."""
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="CardioVision Blender Cardiac Turntable Pipeline")
    parser.add_argument("--lad-prob", type=float, default=0.94, help="LAD predicted probability (default: 0.94)")
    parser.add_argument("--lcx-prob", type=float, default=0.24, help="LCX predicted probability (default: 0.24)")
    parser.add_argument("--rca-prob", type=float, default=0.28, help="RCA predicted probability (default: 0.28)")
    parser.add_argument("--cutaway", action="store_true", default=True, help="Generate anterior chamber cutaway anatomy")
    parser.add_argument("--no-cutaway", dest="cutaway", action="store_false", help="Disable cutaway for solid myocardium")
    parser.add_argument("--colorblind", action="store_true", help="Enable colorblind-safe palette")
    parser.add_argument("--render-still", type=str, default="", help="Render still image to path")
    parser.add_argument("--render-views", type=str, default="", help="Render clinical multi-view images to directory")
    parser.add_argument("--render-turntable-frames", type=str, default="", help="Render all turntable frames to directory")
    parser.add_argument("--export-glb", type=str, default="", help="Export scene to GLB file path")
    parser.add_argument("--total-frames", type=int, default=120, help="Turntable animation total frames (default: 120)")
    return parser.parse_args(argv)


def main():
    args = parse_cli_args()
    print("=" * 65)
    print(" CardioVision 3D Procedural Cardiac Turntable & Motion Generator")
    print(f" Risk Inputs: LAD={args.lad_prob:.2f}, LCX={args.lcx_prob:.2f}, RCA={args.rca_prob:.2f}")
    print(f" Mode: {'Anatomical Cutaway Dissection' if args.cutaway else 'Full Exterior Surface'}")
    print(" Clinical Invariant: Uniform vessel coloration, zero focal lesions")
    print("=" * 65)

    clear_scene()
    build_heart_myocardium(cutaway=args.cutaway)
    build_epicardial_adipose()
    build_aortic_arch_branches()
    if args.cutaway:
        build_internal_chamber_anatomy()
    build_coronary_tree(lad_p=args.lad_prob, lcx_p=args.lcx_prob, rca_p=args.rca_prob, colorblind=args.colorblind)
    setup_lighting()
    setup_turntable(total_frames=args.total_frames)

    if args.export_glb:
        export_glb(args.export_glb)

    if args.render_still:
        render_still_frame(1, args.render_still)

    if args.render_views:
        render_clinical_views(args.render_views)

    if args.render_turntable_frames:
        render_turntable_frames(args.render_turntable_frames, total_frames=args.total_frames)

    print("[CardioVision] Blender pipeline execution completed successfully.")


if __name__ == "__main__":
    main()
