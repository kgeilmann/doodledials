# Decouple Dial Diameter from Cutout Scaling

## Problem

Changing the dial diameter in the Disc Settings panel scales _everything_ in the SVG preview — the disc circle, the cutout paths, marks, and labels — because the SVG viewport size is set to `diameter * DPI / MM_PER_INCH` pixels while the viewBox remains fixed. This means the cutout paths visually grow/shrink with the disc diameter, which is not desired.

The **Scale** control (separate from Diameter) exists specifically to control cutout size independently, but its effect is conflated with diameter.

## Design

### SVG Structure Change

Split the SVG into two logical groups:

1. **`#disc-elements`** — elements that should scale with diameter:
   - `#disc` circle
   - `#center-hole` circle
   - Per-layer marks (mark-line + layer-label text) — moved out of layer groups

2. **Layer groups** — elements that should NOT scale with diameter:
   - Cutout paths (`.cutout`)
   - Path labels (`.path-label`) — stay alongside their cutout

### Rendering (`combineDoodledial`)

- **SVG viewport**: always `maxDiameter * DPI / MM_PER_INCH` pixels (756px at default 200mm max).
- **`#disc-elements`**: scaled by `diameter / maxDiameter` about the viewBox center.
- **Cutout paths**: remain at their normalized viewBox coordinates — constant pixel size.
- **Scale control** (`config.scale`): continues to apply independently via `applyCutoutTransformsForGroup`. Unchanged.

### Math

At `maxDiameter = 200mm`:

- Viewport: 756px, viewBox: 283×283
- Disc radius at 200mm: 141.5 viewBox units → 378px → 100mm physical ✓
- Disc radius at 100mm: 141.5 × 0.5 = 70.75 viewBox units → 189px → 50mm physical ✓
- Cutout (50 viewBox units): 133.5px = 35.3mm (constant) ✓

### Parse Phase (`parseSvgPaths`)

- Create `#disc-elements` group inside `#all`.
- Move `#disc` and `#center-hole` into `#disc-elements`.
- For each layer: move mark (`.mark-line` + `.layer-label`) into `#disc-elements`, preserving `data-layer-id`.
- Each layer group retains: `.cutout` path + `.path-label` text.

### Exports

- **Laser SVG**: uses `combineDoodledial` → same fixed-viewport approach. Disc circle path is physically correct in mm; cutouts constant.
- **STL**: computes `viewboxToMmScale` from disc circle radius — need to verify the math works with the scaled disc radius.
- **Preview SVG**: uses `combineDoodledial` → same as above.

### Optimizer Template

- `createOptimizerSvgTemplate` assembles its own SVG from the raw content. It needs to handle `#disc-elements` — either retain the group structure or flatten equivalently.
- `precomputeOptimizerSvgContent` similarly.

## Files to Change

| File                                    | Change                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/utils/doodledial.ts`           | `parseSvgPaths`: restructure SVG. `combineDoodledial`: fixed viewport + scale `#disc-elements`. `createOptimizerSvgTemplate`/`precomputeOptimizerSvgContent`: update viewport logic. |
| `src/lib/utils/laser-svg-export.ts`     | Verify `combineDoodledial` output is correct for export.                                                                                                                             |
| `src/lib/utils/stl-export.ts`           | Verify `viewboxToMmScale` math with scaled disc.                                                                                                                                     |
| `src/lib/utils/preview-svg-export.ts`   | No change (pass-through).                                                                                                                                                            |
| `src/lib/stores/doodledial.svelte.ts`   | Verify no dependency issues.                                                                                                                                                         |
| `src/lib/components/DialPreview.svelte` | Verify no rendering issues.                                                                                                                                                          |
