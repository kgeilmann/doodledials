# Center Hole for Needle

Add a configurable center hole to the disc so the user can insert a needle to rotate the dial.

## Configuration

### `src/lib/stores/global-config.svelte.ts`

Add `centerHoleDiameter` (mm) to `PersistedConfig` and `DEFAULTS`:

- Default: 2
- Range 0-3 (0 = no hole — hidden in preview, skipped in exports)
- Persist in localStorage alongside existing `diameter`, `pathLabelOptimizerEnabled`, `forceDirectedOptimizerEnabled`

### `src/lib/types/doodledial.ts`

Add to `DialConfig`:

```ts
centerHoleDiameter: number; // mm
```

`DEFAULT_DIAL_CONFIG`: set to 2.

### `src/lib/components/GlobalConfigDialog.svelte`

Add a "Center Hole Diameter (mm)" row below Disc Diameter with a number input (min 0, max 3, step 0.5) and a text label "for needle axle".

Include in draft state, OK commit, and reset.

### `src/lib/stores/doodledial.svelte.ts`

Add `setCenterHoleDiameter(diameter: number)` method that mutates config and triggers re-render.

## SVG Preview

### `src/lib/utils/doodledial.ts`

**In `parseSvgPaths()`:** Add a `<circle id="center-hole">` concentric with `#disc` at the center. Set a placeholder radius. Default style: `fill: none, stroke: black, stroke-dasharray: 2 2` (dashed ring) so it's visible against the empty disc interior.

**In `combineDoodledial()`:** Find `#center-hole` and set its `r` attribute:

```ts
r = config.centerHoleDiameter > 0 ? (config.centerHoleDiameter * MM_TO_PX) / 2 : 0;
```

When 0, set `display: none` or `visibility: hidden`.

## Laser SVG Export

### `src/lib/utils/laser-svg-export.ts`

In `exportLaserSvg()`, find `#center-hole` and when visible (diameter > 0), classify as `operation-cut` (red, 0.1mm stroke) — same treatment as the disc border and cutouts.

## 3D STL Export

### `src/lib/utils/stl-export.ts`

In `exportStl()`, when `config.centerHoleDiameter > 0`:

- Generate a circle polygon at `(cx, cy)` in mm coordinates with `radiusMm = config.centerHoleDiameter / 2`
- Add to `holePolygons` so `createDiscShape()` produces a through-hole

## Data Flow

```
User adjusts center hole diameter in Global Config
  → globalConfig.centerHoleDiameter updated
    → _save() persists to localStorage
    → handleOK() calls doodledialStore.setCenterHoleDiameter(value)
      → config updated → combineDoodledial() re-renders center-hole r

Export:
  exportLaserSvg() → reads config.centerHoleDiameter → classifies hole as cut
  exportStl() → reads config.centerHoleDiameter → adds hole polygon
```

## Test Plan

- `global-config.svelte.ts`: verify default centerHoleDiameter = 2, round-trip, reset to 2
- `GlobalConfigDialog.svelte`: render test with center hole input
- Verify 0-value hides hole in preview and exports
- STL: verify hole polygon is added to disc holes
