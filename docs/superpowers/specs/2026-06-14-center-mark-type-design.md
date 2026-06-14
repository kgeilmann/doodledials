# Center Mark Type for Exports

## Problem

The laser export always renders a cut hole at the disc center. Users want the option to use an engraved crosshair instead (useful for alignment/centering without cutting through), or to have nothing at all.

## Solution

Replace the binary `useCrosshair` boolean with a three-way `CenterMarkType` = `'hole' | 'crosshair' | 'none'`.

## Affected Files and Changes

### `src/lib/types/doodledial.ts`

- Add type: `export type CenterMarkType = 'hole' | 'crosshair' | 'none';`
- Add `centerMarkType: CenterMarkType` to `DialConfig` (default: `'hole'`)

### `src/lib/utils/doodledial.ts`

- Replace `useCrosshair?: boolean` in `CombineDoodledialOptions` with `centerMarkType?: CenterMarkType`
- Update center rendering logic in `combineDoodledial()`:
  - `'hole'`: show center-hole circle at `centerHoleDiameter` radius (current `useCrosshair: false` behavior)
  - `'crosshair'`: hide circle, draw crosshair lines (current `useCrosshair: true` behavior)
  - `'none'`: hide circle, no crosshair (when `centerHoleDiameter` is 0)
- Crosshair is drawn regardless of `centerHoleDiameter` (always engrave if type is `crosshair`)

### `src/lib/utils/laser-svg-export.ts`

- Add `centerMarkType?: CenterMarkType` to `LaserExportOptions`
- Pass it through to `combineDoodledial()` (instead of hardcoded `useCrosshair: false`)
- When type is `'crosshair'`: classify `.center-crosshair` elements as `operation-engrave` (black)
- When type is `'hole'`: classify `#center-hole` as `operation-cut` (red) — same as current
- When type is `'none'`: skip center element entirely

### `src/lib/stores/global-config.svelte.ts`

- Add `centerMarkType: CenterMarkType` to `PersistedConfig` and `DEFAULTS` (default: `'hole'`)
- Wire up load/save/reset

### `src/lib/components/GlobalConfigDialog.svelte`

- Add a segmented control (3 buttons: Hole / Crosshair / None) in the center hole section
- Label updates: "Center Hole" → "Center Mark" section

### `src/lib/components/ExportButton.svelte`

- Accept `centerMarkType` override in `exportSvg()` so dropdown can offer different mark types
- Add dropdown items:
  - "Laser SVG" (uses default/global setting)
  - "Laser SVG (Crosshair)" (overrides to crosshair for this export)
  - "Laser SVG (No Center)" (overrides to none for this export)

## Behavior Matrix

| centerMarkType | centerHoleDiameter > 0 | centerHoleDiameter = 0 |
| -------------- | ---------------------- | ---------------------- |
| `'hole'`       | Cut hole circle        | Nothing                |
| `'crosshair'`  | Engraved crosshair     | Engraved crosshair     |
| `'none'`       | Nothing                | Nothing                |

Crosshair is classified as **engrave** (black, `operation-engrave`).
