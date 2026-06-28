# Multi-Group SVG Export Design

## Problem

When a dial has multiple top-level groups (from the uploaded SVG), the SVG export
currently produces a single dial containing all groups' layers. For laser cutting,
each group represents a separate physical dial face and needs to be exported as
its own complete sub-dial (with circle, center marks, rim marks, and labels)
within the same SVG file, spread across the canvas in a grid layout.

## Design

### New helper: `combineMultiGroupSvg`

A pure function that takes an array of per-group SVG strings and assembles them
into a single SVG with grid layout:

- Parses the first SVG to extract style definitions and viewBox dimensions
- Calculates grid columns/rows based on group count
- Fixed spacing of `viewBoxWidth + 60px` between sub-dials
- Uses string-based XML assembly to wrap each sub-SVG's inner content in a
  `<g transform="translate(x, y)">` group
- Produces a single SVG with shared `<defs>`/`<style>` and all sub-dials

### Per-group SVG generation (laser export)

When `groups.length > 1`:

1. For each group, filter layers to only those belonging to that group and visible
2. Call the existing `exportLaserSvg` with that group's layers (other layers from
   other groups are passed with `visible: false` so they get hidden in the
   combined dial via `respectLayerVisibility`)
3. The existing `exportLaserSvg` already removes non-passed layers after
   combination, giving a clean single-dial SVG per group
4. Pass results to `combineMultiGroupSvg`

### Per-group SVG generation (preview export)

Same approach: call `combineDoodledial` per-group with filtered layers, then
assemble the grid.

### No changes to core dial assembly

`parseSvgPaths`, `combineDoodledial`, stores, and the existing single-dial
export code are unchanged. The multi-group logic is an additive layer in
the export functions only.

### Layer numbering

Per-group (keep original) — each layer retains its original index as assigned
during parsing. No renumbering.

### Grid layout

- Columns: `Math.ceil(Math.sqrt(groupCount))`
- Spacing: `viewBoxWidth + 60px` between sub-dials (fixed hardcoded)
- Each sub-dial is placed with `<g transform="translate(col * spacing, row * spacing)">`

## Files to modify

- `src/lib/utils/laser-svg-export.ts` — modify `exportLaserSvg` to accept
  groups and dispatch to multi-group when count > 1
- `src/lib/utils/preview-svg-export.ts` — modify `exportPreviewSvg` similarly
- `src/lib/utils/export-formats.ts` — export new types if needed
- `src/lib/components/ExportButton.svelte` — pass groups to export functions
