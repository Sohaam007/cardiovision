# 05 3D Spec

Stack: React Three Fiber + drei + zustand.

## Scene
- Heart: a CC-licensed / BodyParts3D mesh decimated to <= 40k triangles, saved as `web/public/heart.glb`. **Fallback:** a stylized procedural heart (scaled/deformed spheres) so the app never depends on a download.
- Torso: low-poly translucent shell, toggle on/off.
- Vessels: procedural `TubeGeometry` from `CatmullRomCurve3`, hand-placed control points over the heart surface, defined in `src/scene/vesselConfig.ts`:
  - **LAD:** from left main, down the anterior interventricular groove to the apex.
  - **LCX:** from left main, wraps the left AV groove to the back (mostly hidden from the front).
  - **RCA:** right AV groove, around the right side to the posterior crux.
  - Left main trunk splits into LAD and LCX.
- Object names/keys exactly `LAD`, `LCX`, `RCA`.
- Each vessel also has an invisible thicker proxy tube for raycasting (hover/click).

## Color
- Probability -> green (low) -> amber -> red (high). Colorblind-safe toggle (e.g. blue -> orange -> magenta).
- Always show the number near the vessel label / in the card, never color alone.
- Color the **whole vessel**; no lesion markers.

## Interaction
- OrbitControls with min/max distance, damped, pan limited.
- Camera presets: Anterior, Left lateral, Posterior (so LCX is visible). Smooth tween.
- Click vessel: fly to it, set `selectedVessel`, open detail panel.
- Heart-wall opacity slider, torso toggle, legend.

## Performance (no dedicated GPU)
`frameloop="demand"` (call `invalidate()` on changes), DPR max 1.5, no shadows or post-processing, `meshStandardMaterial` or basic, heart <= 40k tris, GLB < 5 MB. Show a static fallback image if WebGL fails.

## Heart mesh sourcing (decision order)
1. **Default (no license risk, no download):** procedural stylized heart in code.
2. **Optional upgrade if there is spare time:** BodyParts3D heart parts, https://lifesciencedb.jp/bp3d/ (downloads: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html). Files are OBJ per body part. Pick heart-related parts, merge, decimate to <= 40k triangles, export GLB. Record the exact release/license in `08_ASSETS_LICENSES.md` (latest: CC BY 4.0; older: CC BY-SA 2.1 JP) and show the attribution in the footer.
3. Time-box the mesh work to 1.5 hours. If it is not working by then, ship the procedural heart.
