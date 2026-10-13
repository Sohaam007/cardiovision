# 02 Dataset

Source: UCI "Extension of Z-Alizadeh Sani Dataset" (also on Kaggle). 303 rows. Verify column names against the real CSV; the list below is expected, not guaranteed.

## Targets
- `CAD` (derived from `Cath`: Cad vs Normal), `LAD`, `LCX`, `RCA` (vessel stenosis, binary).
- CAD = at least 50% narrowing in a major vessel (dataset definition).

## Leakage rule (CRITICAL)
Drop `LAD`, `LCX`, `RCA`, `Cath` from X for **every** target. Also drop the raw `CAD` column when predicting a vessel target if it exists in the file. `tests/test_no_leakage.py` must fail if any of these appear in a feature list.

## Expected feature groups
- Demographic: Age, Weight, Length, Sex, BMI
- History/exam: DM, HTN, Current Smoker, EX-Smoker, FH, Obesity, CRF, CVA, Airway disease, Thyroid disease, CHF, DLP, BP, PR, Edema, Weak peripheral pulse, Lung rales, Systolic/Diastolic murmur, Typical chest pain, Dyspnea, Function class, Atypical, Nonanginal, Exertional CP, LowTH Ang
- ECG: Q wave, ST elevation, ST depression, T inversion, LVH, Poor R progression, BBB
- Lab: FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT
- Echo: EF-TTE, Region RWMA (categorical), VHD (categorical)

## Preprocessing
- Binary-encode Y/N, Male/Female, etc.
- One-hot `Region RWMA` and `VHD` (inside the pipeline).
- Drop constant columns. Check missing values.
- Check cross-tab: `Cath` vs any-vessel stenosis. If they conflict, document how handled.
- Report class balance per target. Use `class_weight` / `scale_pos_weight`, not SMOTE.
- All preprocessing inside an sklearn `Pipeline` (no fitting on test folds).

## Source and citation
- Use: https://archive.ics.uci.edu/dataset/411/extention+of+z (the **Extension**, 59 features, has LAD/LCX/RCA).
- Do NOT use id 412 (original dataset, 54 features, no vessel labels).
- License: CC BY 4.0 per the dataset family; confirm on the 411 page. Cite: Alizadehsani, Roshanzamir, Sani, UCI Machine Learning Repository.
- Reported class balance for the original data: 216 CAD vs 87 normal. Check your own counts per target.
- Download the .xlsx, convert to CSV once, commit to `data/raw/`.
