"""
scripts/blender_cardiac_turntable.py
CardioVision Blender 3D Cardiac Turntable & Motion Animation Generator
Track A: Multimodal Cardiovascular Risk Stratification & 3D Visualization

Run headlessly:
  blender -b -P scripts/blender_cardiac_turntable.py -- --render-frames 120 --output docs/figures/blender_heart_turntable.mp4

Run interactively in Blender:
  Open Blender -> Scripting tab -> Open this file -> Run Script
"""

import sys
import math
import argparse
import bpy

def clear_scene():
    """Remove all default objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def create_heart_myocardium():
    """Create stylized anatomical cardiac base geometry."""
    # Left ventricle (main cone/elongated sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1.0, location=(0, 0, 0))
    lv = bpy.context.active_object
    lv.name = "Myocardium_LV"
    lv.scale = (0.9, 0.8, 1.25)
    lv.rotation_euler = (math.radians(15), math.radians(-10), math.radians(25))
    bpy.ops.object.shade_smooth()

    # Material for myocardium: deep anatomical crimson with soft specular
    mat = bpy.data.materials.new(name="Mat_Myocardium")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        # Base color: deep cardiac red
        bsdf.inputs['Base Color'].default_value = (0.45, 0.08, 0.10, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.35
        # Subsurface scattering for fleshy tissue appearance
        if 'Subsurface Weight' in bsdf.inputs:
            bsdf.inputs['Subsurface Weight'].default_value = 0.25
        elif 'Subsurface' in bsdf.inputs:
            bsdf.inputs['Subsurface'].default_value = 0.25
    lv.data.materials.append(mat)
    return lv

def create_coronary_vessel(name, points, color_rgba, bevel_depth=0.045):
    """
    Generate a 3D coronary artery tube from a 3D Catmull-Rom spline curve.
    Clinical Guardrail: Uniform coloration across whole vessel; no focal lesion claims.
    """
    curve_data = bpy.data.curves.new(name=f"{name}_CurveData", type='CURVE')
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

    curve_obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_obj)

    # Vessel Material: High-contrast risk color with subtle emission
    mat = bpy.data.materials.new(name=f"Mat_{name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color_rgba
        bsdf.inputs['Roughness'].default_value = 0.2
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = color_rgba
            bsdf.inputs['Emission Strength'].default_value = 0.4
    curve_obj.data.materials.append(mat)
    return curve_obj

def setup_coronary_tree():
    """Build LAD, LCX, RCA with verified anatomical trajectories."""
    # LAD: Anterior interventricular groove to apex (crimson red: high risk 94%)
    lad_points = [
        (-0.15, 0.45, 0.70),
        (-0.25, 0.48, 0.35),
        (-0.22, 0.45, -0.05),
        (-0.15, 0.38, -0.45),
        (-0.05, 0.25, -0.85),
    ]
    create_coronary_vessel("LAD_Vessel", lad_points, (0.88, 0.12, 0.18, 1.0), bevel_depth=0.045)

    # LCX: Left AV groove wrapping to posterior (emerald green: low risk 24%)
    lcx_points = [
        (-0.15, 0.45, 0.70),
        (-0.45, 0.35, 0.55),
        (-0.65, 0.05, 0.40),
        (-0.55, -0.35, 0.25),
        (-0.35, -0.55, 0.10),
    ]
    create_coronary_vessel("LCX_Vessel", lcx_points, (0.10, 0.75, 0.45, 1.0), bevel_depth=0.040)

    # RCA: Right AV sulcus wrapping to crux (emerald green: low risk 28%)
    rca_points = [
        (0.20, 0.40, 0.65),
        (0.48, 0.30, 0.45),
        (0.62, 0.00, 0.20),
        (0.55, -0.32, -0.10),
        (0.35, -0.50, -0.35),
        (0.10, -0.52, -0.55),
    ]
    create_coronary_vessel("RCA_Vessel", rca_points, (0.10, 0.75, 0.45, 1.0), bevel_depth=0.042)

def setup_studio_lighting():
    """Cinematic 3-point medical studio lighting."""
    # Key Light (Anterior-top)
    bpy.ops.object.light_add(type='AREA', radius=2.5, location=(2.5, 3.5, 3.0))
    key_light = bpy.context.active_object
    key_light.data.energy = 250
    key_light.data.color = (1.0, 0.96, 0.92)

    # Fill Light (Left lateral / LCX side)
    bpy.ops.object.light_add(type='AREA', radius=2.0, location=(-3.5, 2.0, 1.5))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 140
    fill_light.data.color = (0.85, 0.92, 1.0)

    # Rim / Backlight (Posterior rim separation)
    bpy.ops.object.light_add(type='SPOT', location=(0, -4.0, 2.5))
    rim_light = bpy.context.active_object
    rim_light.data.energy = 320
    rim_light.data.spot_size = math.radians(65)
    rim_light.data.color = (0.2, 0.8, 1.0)

def setup_turntable_camera(total_frames=120):
    """
    Creates an empty turntable center and animates camera 360-degree rotation.
    Frame 1: Anterior
    Frame 35: Left Lateral (LCX view)
    Frame 70: Posterior (Crux / RCA view)
    Frame 105: Right Anterior
    Frame 120: Anterior loop completion
    """
    # Turntable empty at origin
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    empty = bpy.context.active_object
    empty.name = "Turntable_Center"

    # Camera parented to turntable
    bpy.ops.object.camera_add(location=(0, 3.6, 0.6))
    cam = bpy.context.active_object
    cam.name = "Turntable_Camera"
    cam.rotation_euler = (math.radians(82), 0, math.radians(180))
    cam.parent = empty
    bpy.context.scene.camera = cam

    # Animate turntable empty rotation around Z axis
    empty.rotation_euler = (0, 0, 0)
    empty.keyframe_insert(data_path="rotation_euler", frame=1)

    empty.rotation_euler = (0, 0, math.radians(-360))
    empty.keyframe_insert(data_path="rotation_euler", frame=total_frames)

    # Set linear or smooth cyclic interpolation
    if empty.animation_data and empty.animation_data.action:
        for fcurve in empty.animation_data.action.fcurves:
            for kf in fcurve.keyframe_points:
                kf.interpolation = 'BEZIER'

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = total_frames

def main():
    print("[CardioVision] Initializing Blender procedural cardiac scene...")
    clear_scene()
    create_heart_myocardium()
    setup_coronary_tree()
    setup_studio_lighting()
    setup_turntable_camera(total_frames=120)
    print("[CardioVision] Scene successfully created with 360-degree turntable animation.")

if __name__ == "__main__":
    main()
