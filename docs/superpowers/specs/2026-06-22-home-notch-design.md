# Home Notch — Start Position Indicator

## Problem

When a physical Doodledial disc is printed or laser-cut, all layer marks (lines + numbers) look identical. Finding which mark corresponds to layer 1 — and thus where to start — requires scanning numbers around the disc. This is slow and error-prone, especially on small discs or when numbers are hard to read upside-down.

There is no dedicated "this is the starting position" visual indicator in the current output.

## Solution

Add a small filled triangle (▲) just inside the outer disc edge at the 12 o'clock (0°) position. This "home notch" serves as a fixed reference point:

- **Digital preview**: A static visual anchor at the top of the disc indicating "this is 0° / 12 o'clock"
- **Physical disc**: An engraved reference mark — rotate the disc until the notch is at top to reach the beginning state (mark 1 at 12 o'clock)

All mark lines and labels remain visually uniform. Only the notch distinguishes the start position.

## Visual

```
        ▲    ← filled triangle just inside disc edge
   ┌─────────┐
   │  1      │
   │  ─      │
   │         │
   │   2     │
   │   ─     │
   └─────────┘
```

- Shape: filled polygon (triangle), pointing outward
- Position: centered at 12 o'clock, just inside the outer disc circle
- Size: ~3–4% of disc diameter, with a minimum pixel dimension
- Color: matches the disc outline stroke color (black in preview, engrave color in laser export)

## Implementation

### SVG structure

Added to the `disc-elements` group (same level as `#disc`, `#center-hole`, `.center-crosshair`):

```xml
<polygon points="..." fill="black" class="home-notch"/>
```

The three points of the triangle, in viewBox coordinates relative to disc center (cx, cy) and radius r:

- Top point: (cx, cy - r + 4px) — just inside the outer disc edge
- Bottom-left: (cx - 3, cy - r + 10px)
- Bottom-right: (cx + 3, cy - r + 10px)

These absolute viewBox coordinates are the canonical size at max diameter. The notch scales with the `disc-elements` group scaling (`config.diameter / config.maxDiameter`), so it shrinks proportionally on smaller discs.

### CSS class

```css
.home-notch {
	pointer-events: none;
}
```

No interaction — purely visual.

### Laser export

In `laser-svg-export.ts`, `.home-notch` elements receive the `operation-engrave` class, following the same pattern as `.center-crosshair`, `.mark-line`, and `.nine-underscore`.

### Config

No new config option. The notch is always shown, analogous to the disc outline circle itself — it is a structural element, not an optional overlay.

## Files to modify

1. **`src/lib/utils/doodledial.ts`** — Add `.home-notch` polygon creation in the `parseSvgPaths` function (after `#disc` creation, inside the `disc-elements` group). No change needed in `combineDoodledial` — the notch is part of `disc-elements` inside `content.raw` and survives all transforms.
2. **`src/lib/utils/laser-svg-export.ts`** — Add `.home-notch` to the engrave-class mapping.

## Out of scope

- No interactive behavior (no dragging, no hover effects)
- No toggle or config option
- No changes to individual layer marks
- No changes to the label numbering system
