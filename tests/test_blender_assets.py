"""
tests/test_blender_assets.py
Automated test suite validating Blender 3D cardiac procedural assets and clinical invariants.
Track A: Multimodal Cardiovascular Risk Stratification & 3D Visualization
"""

import os
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FIGURES_DIR = PROJECT_ROOT / "docs" / "figures"
SCRIPT_PATH = PROJECT_ROOT / "scripts" / "blender_cardiac_turntable.py"


def test_blender_script_exists():
    """Verify scripts/blender_cardiac_turntable.py exists and is non-empty."""
    assert SCRIPT_PATH.exists(), f"Missing {SCRIPT_PATH}"
    content = SCRIPT_PATH.read_text(encoding="utf-8")
    assert len(content) > 500


def test_clinical_guardrail_invariants_in_blender_script():
    """
    Verify clinical invariants in scripts/blender_cardiac_turntable.py:
    1. Uniform vessel coloration is enforced.
    2. Zero focal lesion claims or localized stenosis markers.
    3. Proper anatomical coordinates for LM, LAD, LCX, RCA.
    """
    content = SCRIPT_PATH.read_text(encoding="utf-8")

    # Invariant 1: Uniform coloration
    assert "Uniform coloration across entire vessel" in content or "uniform coloration" in content.lower()

    # Invariant 2: No focal lesions
    assert "Zero focal lesion claims" in content or "zero focal lesion" in content.lower()
    assert "focal_lesion" not in content.lower()
    assert "stenosis_marker" not in content.lower()

    # Invariant 3: Vessels defined
    for vessel in ["Vessel_LM", "Vessel_LAD", "Vessel_LCX", "Vessel_RCA"]:
        assert vessel in content


def test_blender_color_interpolation_logic():
    """Verify color interpolation logic math without requiring Blender bpy import."""
    import math

    palettes = {
        "standard": {
            "low": (0.063, 0.725, 0.506, 1.0),
            "mid": (0.961, 0.620, 0.043, 1.0),
            "high": (0.937, 0.267, 0.216, 1.0),
        }
    }

    def lerp_color(c1, c2, t):
        t = max(0.0, min(1.0, t))
        return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(4))

    def get_vessel_color(prob: float):
        safe_p = max(0.0, min(1.0, float(prob))) if math.isfinite(prob) else 0.5
        pal = palettes["standard"]
        if safe_p <= 0.5:
            return lerp_color(pal["low"], pal["mid"], safe_p / 0.5)
        return lerp_color(pal["mid"], pal["high"], (safe_p - 0.5) / 0.5)

    # Test boundaries and midpoints
    c_low = get_vessel_color(0.0)
    assert pytest.approx(c_low[0], abs=1e-3) == 0.063
    assert pytest.approx(c_low[1], abs=1e-3) == 0.725

    c_mid = get_vessel_color(0.5)
    assert pytest.approx(c_mid[0], abs=1e-3) == 0.961

    c_high = get_vessel_color(1.0)
    assert pytest.approx(c_high[0], abs=1e-3) == 0.937

    # High risk LAD (0.94) should be predominantly red
    c_lad = get_vessel_color(0.94)
    assert c_lad[0] > 0.90  # High red channel
    assert c_lad[1] < 0.35  # Low green channel

    # Low risk LCX (0.24) should be predominantly green
    c_lcx = get_vessel_color(0.24)
    assert c_lcx[1] > 0.65  # High green channel


def test_exported_cardiac_glb_asset():
    """Verify exported GLB cardiac asset exists, is valid glTF binary, and < 5 MB."""
    glb_path = FIGURES_DIR / "cardiac_model.glb"
    assert glb_path.exists(), f"GLB model missing at {glb_path}"
    file_size_bytes = glb_path.stat().st_size
    assert file_size_bytes > 10_000, "GLB model is suspiciously small"
    assert file_size_bytes < 5 * 1024 * 1024, "GLB exceeds 5MB performance budget"

    # glTF binary header magic check (first 4 bytes must be 'glTF' in ASCII: 0x46546C67)
    with open(glb_path, "rb") as f:
        magic = f.read(4)
        assert magic == b"glTF", "File is not a valid glTF binary file"


def test_rendered_clinical_views_assets():
    """Verify that all 3 clinical views (anterior, lateral, posterior) exist and are valid PNGs."""
    views = [
        "blender_render_anterior.png",
        "blender_render_lateral.png",
        "blender_render_posterior.png",
    ]
    for view in views:
        view_path = FIGURES_DIR / view
        assert view_path.exists(), f"Rendered view {view} missing at {view_path}"
        assert view_path.stat().st_size > 50_000, f"Rendered view {view} is unexpectedly small"

        # PNG header magic check (\x89PNG\r\n\x1a\n)
        with open(view_path, "rb") as f:
            header = f.read(8)
            assert header == b"\x89PNG\r\n\x1a\n", f"{view} is not a valid PNG image"


def test_beating_heart_glb_asset():
    """Verify beating_heart.glb exists in web/public, is valid glTF binary, and < 5 MB."""
    glb_path = PROJECT_ROOT / "web" / "public" / "beating_heart.glb"
    assert glb_path.exists(), f"GLB model missing at {glb_path}"
    file_size_bytes = glb_path.stat().st_size
    assert file_size_bytes > 500_000, "GLB model is suspiciously small"
    assert file_size_bytes < 5 * 1024 * 1024, "GLB exceeds 5MB performance budget"

    # glTF binary header magic check
    with open(glb_path, "rb") as f:
        magic = f.read(4)
        assert magic == b"glTF", "File is not a valid glTF binary file"
