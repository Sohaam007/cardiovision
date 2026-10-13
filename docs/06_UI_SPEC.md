# 06 UI Spec

Layout (desktop): top disclaimer banner; left 60% 3D canvas; right 40% dashboard. On mobile, stack.

## Components
1. **Overall CAD card:** probability, label (Likely CAD / Unlikely), CI, threshold.
2. **Vessel cards (LAD, LCX, RCA):** probability + color chip matching the 3D color; click selects vessel in 3D.
3. **SHAP waterfall / bar:** for the selected target (default CAD); signed bars, top 10 features.
4. **Measurement cards:** feature, patient value, reference range (with source from `reference_ranges.json`), signed contribution bar.
5. **What-if panel:** sliders for Age, LDL, BP, EF-TTE, etc.; debounce 300 ms; recolors 3D live.
6. **Patient picker:** demo patients + manual form generated from `/schema` with validation.
7. **Model info drawer:** CV metrics per target (mean ± SD), calibration note, limitations.
8. **Disclaimer:** persistent top banner, footer, first-load acknowledgement modal.
9. **States:** loading, "warming up model server...", API error -> demo mode banner.

## Style
Dark clinical theme, high contrast, labels not color-only, keyboard accessible, readable on a laptop at 1366x768.
