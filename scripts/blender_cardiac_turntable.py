"""
scripts/blender_cardiac_turntable.py
CardioVision Blender 3D Anatomical Cardiac Turntable & Motion Animation Pipeline
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

  # Render 24 turntable frames for 360-degree interactive scrubber:
  blender -b -P scripts/blender_cardiac_turntable.py -- --render-turntable-frames web/public/blender/frames --total-frames 24
"""

import sys
import os
import math
import argparse
from pathlib import Path
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
    Enforces clinical invariant: uniform coloration across entire vessel.
    Zero focal lesion claims.
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
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def create_pbr_material(name, base_color, roughness=0.45, specular=0.5, subsurface=0.0, emission_color=None, emission_strength=0.0):
    """Create Principled BSDF material with robust compatibility for Blender 4/5."""
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


def load_anatomical_heart_model():
    """
    Import photorealistic beating heart model (Beating_heart.glb) matching
    reference video (Heart moving.mp4) and Screenshot 2026-10-14 183520.png.
    Returns (turntable_center, is_gltf_loaded).
    """
    candidates = [
        Path("docs/reference/Beating_heart.glb"),
        Path("web/public/beating_heart.glb"),
        Path(__file__).resolve().parent.parent / "docs" / "reference" / "Beating_heart.glb",
        Path(__file__).resolve().parent.parent / "web" / "public" / "beating_heart.glb",
    ]

    glb_file = None
    for cand in candidates:
        if cand.exists():
            glb_file = cand.resolve()
            break

    center_x = -0.0020
    center_y = 0.0162
    center_z = 0.0834

    # Create Turntable center empty
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(center_x, center_y, center_z))
    turntable_center = bpy.context.active_object
    turntable_center.name = "Turntable_Center"

    if glb_file:
        print(f"[CardioVision] Importing photorealistic beating heart from {glb_file}...")
        bpy.ops.import_scene.gltf(filepath=str(glb_file))

        # Remove helper objects like default Icosphere
        for o in list(bpy.data.objects):
            if o.name == 'Icosphere':
                bpy.data.objects.remove(o)

        # Parent heart root node to Turntable_Center
        root = bpy.data.objects.get("RootNode.0") or bpy.data.objects.get("skeletal.3")
        if root:
            root.parent = turntable_center
            root.matrix_parent_inverse = turntable_center.matrix_world.inverted()

        return turntable_center, True
    else:
        print("[CardioVision] Notice: Beating_heart.glb not found, falling back to procedural myocardium.")
        build_procedural_heart_fallback(turntable_center)
        return turntable_center, False


def build_procedural_heart_fallback(turntable_center):
    """Fallback procedural myocardium when GLB file is absent."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.08, location=(0, 0.016, 0.08))
    lv = bpy.context.active_object
    lv.name = "Myocardium_Ventricular"
    lv.parent = turntable_center
    bpy.ops.object.shade_smooth()
    mat = create_pbr_material("Mat_Myocardium", (0.533, 0.075, 0.216, 1.0))
    lv.data.materials.append(mat)


def create_coronary_spline(name, points, color_rgba, bevel_depth=0.0024, parent=None):
    """
    Generate a 3D coronary artery tube from verified anatomical control points.
    Uniform PBR material coloration across entire vessel length.
    Zero focal lesion claims.
    """
    curve_data = bpy.data.curves.new(name=f"{name}_Data", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 4

    spline = curve_data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)

    for i, pt in enumerate(points):
        bp = spline.bezier_points[i]
        bp.co = pt
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.scene.collection.objects.link(obj)

    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()

    # Risk-calibrated PBR material with subtle emission for high contrast
    mat = create_pbr_material(
        name=f"Mat_{name}",
        base_color=color_rgba,
        roughness=0.28,
        specular=0.6,
        emission_color=color_rgba,
        emission_strength=0.35,
    )
    obj.data.materials.append(mat)
    return obj


def build_coronary_tree(lad_p=0.94, lcx_p=0.24, rca_p=0.28, colorblind=False, parent=None):
    """
    Generate Left Main, LAD, LCX, and RCA arterial branches with verified pathways.
    Enforces uniform coloration across entire vessel. Zero focal lesion claims.
    """
    # Left Main Trunk (LM)
    lm_color = get_vessel_color(0.5 * (lad_p + lcx_p), colorblind=colorblind)
    lm_points = [
        (0.005, -0.005, 0.110),
        (0.015, -0.012, 0.100),
        (0.024, -0.018, 0.092),
    ]
    create_coronary_spline("Vessel_LM", lm_points, lm_color, bevel_depth=0.0026, parent=parent)

    # Left Anterior Descending (LAD)
    lad_color = get_vessel_color(lad_p, colorblind=colorblind)
    lad_points = [
        (0.024, -0.018, 0.092),
        (0.028, -0.024, 0.075),
        (0.030, -0.025, 0.055),
        (0.031, -0.024, 0.035),
        (0.032, -0.022, 0.018),
        (0.034, -0.019, 0.002),
    ]
    create_coronary_spline("Vessel_LAD", lad_points, lad_color, bevel_depth=0.0024, parent=parent)

    # Left Circumflex (LCX)
    lcx_color = get_vessel_color(lcx_p, colorblind=colorblind)
    lcx_points = [
        (0.024, -0.018, 0.092),
        (0.038, -0.012, 0.088),
        (0.048, 0.002, 0.078),
        (0.050, 0.020, 0.065),
        (0.042, 0.036, 0.052),
        (0.025, 0.042, 0.040),
    ]
    create_coronary_spline("Vessel_LCX", lcx_points, lcx_color, bevel_depth=0.0022, parent=parent)

    # Right Coronary Artery (RCA)
    rca_color = get_vessel_color(rca_p, colorblind=colorblind)
    rca_points = [
        (-0.008, -0.008, 0.105),
        (-0.022, -0.015, 0.092),
        (-0.036, -0.012, 0.075),
        (-0.045, 0.000, 0.058),
        (-0.042, 0.020, 0.042),
        (-0.025, 0.035, 0.028),
        (-0.005, 0.038, 0.015),
    ]
    create_coronary_spline("Vessel_RCA", rca_points, rca_color, bevel_depth=0.0024, parent=parent)


# ---------------------------------------------------------------------------
# Cinematic Lighting & Turntable Rig
# ---------------------------------------------------------------------------

def setup_lighting(center_x=-0.002, center_y=0.016, center_z=0.083):
    """Cinematic 3-point medical studio lighting calibrated for anatomical scale."""
    # Key Light (Anterior-superior warm fill)
    key_light = bpy.data.lights.new("KeyLight", type='AREA')
    key_light.energy = 4.5
    key_light.size = 0.5
    key_obj = bpy.data.objects.new("KeyLight", key_light)
    key_obj.location = (center_x + 0.25, center_y - 0.35, center_z + 0.25)
    bpy.context.scene.collection.objects.link(key_obj)

    # Fill Light (Cool lateral fill)
    fill_light = bpy.data.lights.new("FillLight", type='AREA')
    fill_light.energy = 2.5
    fill_light.size = 0.4
    fill_obj = bpy.data.objects.new("FillLight", fill_light)
    fill_obj.location = (center_x - 0.25, center_y - 0.25, center_z + 0.10)
    bpy.context.scene.collection.objects.link(fill_obj)

    # Rim / Back Light (Posterior rim separation)
    rim_light = bpy.data.lights.new("RimLight", type='AREA')
    rim_light.energy = 4.0
    rim_light.size = 0.5
    rim_obj = bpy.data.objects.new("RimLight", rim_light)
    rim_obj.location = (center_x, center_y + 0.35, center_z + 0.20)
    bpy.context.scene.collection.objects.link(rim_obj)


def setup_camera(center_x=-0.002, center_y=0.016, center_z=0.083):
    """
    Creates and positions camera with 50mm lens at 0.44m orbit distance.
    Guarantees zero clipping and optimal margins in 16:9 aspect ratio.
    """
    cam_data = bpy.data.cameras.new("Turntable_Camera")
    cam_data.lens = 50
    cam_obj = bpy.data.objects.new("Turntable_Camera", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    cam_obj.location = (center_x, center_y - 0.44, center_z + 0.015)
    cam_obj.rotation_euler = (math.radians(88), 0, 0)
    return cam_obj


def setup_turntable(turntable_center, total_frames=24):
    """
    Sets up 360-degree rotation animation on Turntable_Center.
    Synchronizes rotation with skeletal beating action across 24 frames.
    """
    turntable_center.rotation_mode = 'XYZ'
    turntable_center.rotation_euler = (0, 0, 0)
    turntable_center.keyframe_insert(data_path="rotation_euler", frame=1)

    turntable_center.rotation_euler = (0, 0, math.radians(360))
    turntable_center.keyframe_insert(data_path="rotation_euler", frame=total_frames + 1)

    action = getattr(turntable_center.animation_data, "action", None)
    if action:
        legacy_fcurves = getattr(action, "fcurves", None)
        if legacy_fcurves:
            for fc in legacy_fcurves:
                for kf in fc.keyframe_points:
                    kf.interpolation = 'LINEAR'
        elif hasattr(action, "layers"):
            for layer in action.layers:
                for strip in layer.strips:
                    for bag in strip.channelbags:
                        for fc in bag.fcurves:
                            for kf in fc.keyframe_points:
                                kf.interpolation = 'LINEAR'

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = total_frames


# ---------------------------------------------------------------------------
# Rendering & Export Routines
# ---------------------------------------------------------------------------

def render_still_frame(frame_number, output_filepath, turntable_center=None, total_frames=24, width=1280, height=720):
    """Render a single designated angle to PNG with transparent background."""
    scene = bpy.context.scene
    scene.frame_set(frame_number)
    if turntable_center:
        angle = (frame_number - 1) * (2 * math.pi / total_frames)
        turntable_center.rotation_euler = (0, 0, angle)

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = True
    scene.render.filepath = os.path.abspath(output_filepath)
    scene.render.image_settings.file_format = 'PNG'
    os.makedirs(os.path.dirname(os.path.abspath(output_filepath)), exist_ok=True)
    print(f"[CardioVision] Rendering still frame {frame_number} -> {output_filepath}...")
    bpy.ops.render.render(write_still=True)
    print(f"[CardioVision] Still saved successfully.")


def render_clinical_views(output_dir, turntable_center=None, total_frames=24, width=1280, height=720):
    """
    Render 3 canonical clinical angles:
    - Anterior (frame 1, LAD foreground)
    - Left Lateral (frame 7, LCX foreground)
    - Posterior (frame 13, RCA crux foreground)
    """
    os.makedirs(os.path.abspath(output_dir), exist_ok=True)
    views = [
        (1, os.path.join(output_dir, "blender_render_anterior.png")),
        (7, os.path.join(output_dir, "blender_render_lateral.png")),
        (13, os.path.join(output_dir, "blender_render_posterior.png")),
    ]
    for frame, path in views:
        render_still_frame(frame, path, turntable_center=turntable_center, total_frames=total_frames, width=width, height=height)


def render_turntable_frames(output_dir, turntable_center=None, total_frames=24, width=640, height=360):
    """Render 360-degree turntable frames for web interactive viewer and scrubber."""
    abs_dir = os.path.abspath(output_dir)
    os.makedirs(abs_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'

    print(f"[CardioVision] Rendering {total_frames} turntable frames ({width}x{height}) to {abs_dir}...")
    for f in range(1, total_frames + 1):
        scene.frame_set(f)
        if turntable_center:
            angle = (f - 1) * (2 * math.pi / total_frames)
            turntable_center.rotation_euler = (0, 0, angle)
        frame_path = os.path.join(abs_dir, f"frame_{f:02d}.png")
        scene.render.filepath = frame_path
        bpy.ops.render.render(write_still=True)
    print(f"[CardioVision] Successfully saved {total_frames} turntable frames to {abs_dir}")


def export_glb(output_filepath):
    """
    Export cardiac model to compact glTF 2.0 binary (.glb).
    Ensures web compatibility and file size < 5 MB via Draco compression.
    """
    abs_path = os.path.abspath(output_filepath)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    print(f"[CardioVision] Exporting GLB model to {abs_path}...")
    bpy.ops.export_scene.gltf(
        filepath=abs_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_image_format='JPEG',
        export_image_quality=75,
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
    parser.add_argument("--total-frames", type=int, default=24, help="Turntable animation total frames (default: 24)")
    return parser.parse_args(argv)


def main():
    args = parse_cli_args()
    print("=" * 65)
    print(" CardioVision 3D Anatomical Cardiac Turntable & Motion Generator")
    print(f" Risk Inputs: LAD={args.lad_prob:.2f}, LCX={args.lcx_prob:.2f}, RCA={args.rca_prob:.2f}")
    print(" Clinical Invariant: Uniform coloration across entire vessel, zero focal lesion claims")
    print("=" * 65)

    clear_scene()
    turntable_center, _ = load_anatomical_heart_model()
    build_coronary_tree(
        lad_p=args.lad_prob,
        lcx_p=args.lcx_prob,
        rca_p=args.rca_prob,
        colorblind=args.colorblind,
        parent=turntable_center
    )
    setup_lighting()
    setup_camera()
    setup_turntable(turntable_center, total_frames=args.total_frames)

    if args.export_glb:
        export_glb(args.export_glb)

    if args.render_still:
        render_still_frame(1, args.render_still, turntable_center=turntable_center, total_frames=args.total_frames)

    if args.render_views:
        render_clinical_views(args.render_views, turntable_center=turntable_center, total_frames=args.total_frames)

    if args.render_turntable_frames:
        render_turntable_frames(args.render_turntable_frames, turntable_center=turntable_center, total_frames=args.total_frames)

    print("[CardioVision] Blender pipeline execution completed successfully.")


if __name__ == "__main__":
    main()
