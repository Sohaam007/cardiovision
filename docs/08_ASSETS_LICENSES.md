# 08 Assets and Licenses

Rule: no asset goes into the repo without a row here. Attribution text goes in the app footer, the README and the report.

| Asset | Source URL | License (checked 13 Oct 2026) | Attribution text | Modified? |
|---|---|---|---|---|
| Z-Alizadeh Sani **Extension** dataset (303 patients, includes LAD/LCX/RCA/Cath) | https://archive.ics.uci.edu/dataset/411/extention+of+z | CC BY 4.0 (confirmed on the original dataset page, id 412; the extension is listed as Creative Commons Attribution on mirrors. Re-check the license box on the page for id 411) | Alizadehsani, R., Roshanzamir, M., Sani, Z. "Extension of Z-Alizadeh Sani Dataset". UCI Machine Learning Repository. | Cleaned/encoded |
| BodyParts3D heart parts (OPTIONAL) | https://lifesciencedb.jp/bp3d/ , downloads: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html , license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html | Latest release (license page updated 2025/02/27): CC BY 4.0. Older releases (and the Anatomography site): CC BY-SA 2.1 Japan, which requires share-alike. **Note which version you download and use its license.** | Latest: "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International". Older: "...licensed under CC Attribution-Share Alike 2.1 Japan". | Decimated, converted to GLB |
| Z-Anatomy meshes (only if used instead of raw BodyParts3D) | https://github.com/Z-Anatomy/Models-of-human-anatomy | CC BY-SA 4.0 (derived from BodyParts3D, share-alike) | "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0" plus the BodyParts3D line | Decimated |
| Procedural heart / vessel tubes | our own code | repo license | n/a | n/a |
| Torso shell | procedural (our code) | repo license | n/a | n/a |
| Beating Heart (Cutaway & Motion Model) | https://skfb.ly/oyyPK by jalmer | CC BY 4.0 | "Beating-heart" by jalmer licensed under CC-BY-4.0 | Optimized with Draco mesh compression & JPEG textures (1.33 MB, 34.5k triangles) |
| Realistic Human Heart Reference | https://skfb.ly/oyBCT by neshallads | CC BY 4.0 | "Realistic Human Heart" by neshallads licensed under CC-BY-4.0 | Reference high-res ZBrush sculpt |

## Practical notes
- If you use a BodyParts3D (older) or Z-Anatomy mesh, share-alike applies to the mesh derivative; keep the GLB under the same license and say so in the footer. Using the procedural heart avoids this entirely.
- Wrong dataset warning: UCI id **412** is the original Z-Alizadeh Sani dataset (54 features). The task needs id **411**, the Extension (59 features) with LAD/LCX/RCA columns.
