# Laser and 3D Export Design

Date: 2026-05-31
Status: Draft for review

## Summary

Add a dual export workflow to Doodle Dials with two user-selectable outputs:

- `Laser SVG` for laser cutting and engraving.
- `3D STL` for printing a physical dial.

The current SVG export remains the shared source of truth for 2D dial geometry. The new design layers format-specific serialization on top of that geometry so the same dial can be exported either as a laser-ready SVG or as a printable mesh.

## Goals

- Let the user choose which export target they want at export time.
- Keep the existing SVG export behavior available as the laser-cut path.
- Produce a laser SVG that clearly separates cut operations from engraved operations.
- Produce an STL where the dial is a solid disc with cutout holes and raised marks/labels on top.
- Keep the geometry rules deterministic and testable.

## Non-goals

- No server-side export service.
- No slicing or G-code generation.
- No 3MF, STEP, or OBJ export in v1.
- No kerf compensation UI in v1.
- No support for multiple material colors or multi-body assembly in the STL export.

## Current State

The app already has a single SVG export path that serializes the current dial into a downloadable SVG file. That path is the right foundation for both new formats because it already knows about layers, cutouts, labels, rotations, offsets, and scale.

The new work should not replace the existing geometry model. It should extend it with format-specific writers.

## User-Facing Behavior

The export entry point should offer a format chooser with two options:

- `Laser SVG`
- `3D STL`

The user picks one format and then exports.

### Laser SVG output

Laser SVG should include everything needed to manufacture the dial in 2D:

- the outer disc boundary is a cut operation
- the cutout shapes are cut operations
- mark lines are engraved operations
- labels are engraved operations

Text labels should be converted to vector outlines before export so the laser result does not depend on font availability on the CAM machine.

Operation encoding for the laser SVG should use color-coded strokes so downstream laser tools can separate cut and engrave passes reliably.

### STL output

The STL output should represent the dial as a printable solid:

- the disc is extruded to a single configurable base thickness
- all cutouts become through-holes in the disc
- mark lines and labels are added as raised geometry on the top face
- the final mesh should be watertight and printable as one body

The STL should not try to preserve the 2D export semantics literally. It should instead map the dial into a 3D relief model.

## Format Rules

### Laser SVG rules

- Use the current SVG-based dial geometry as the base.
- Treat the outer circle and cutouts as cut geometry.
- Treat mark lines and labels as engraved geometry.
- Convert labels to vector paths before output.
- Use color-coded stroke conventions to distinguish cut and engrave operations.
- Keep the output as a single SVG file.

### STL rules

The STL exporter should build a simple height model:

- `disc thickness` defines the base slab height.
- `mark thickness` defines the relief height for mark lines and labels.
- cutouts are removed from the base slab all the way through.
- marks and labels sit on top of the slab as additive geometry.

This model intentionally keeps the STL readable as a physical object rather than a visual replica of the SVG.

## Proposed Architecture

### Shared geometry layer

Introduce a format-neutral geometry layer that can describe the dial in terms of:

- outer disc boundary
- cutout regions
- mark line paths
- label outlines
- layer metadata and transforms

This layer should be derived from the same current dial state that already feeds SVG export.

### Export writers

Add two writers that consume the shared geometry layer:

- `LaserSvgWriter` serializes the geometry into a laser-friendly SVG.
- `StlWriter` converts the geometry into a printable mesh.

The writers should not directly read from UI state. They should depend on a normalized geometry model so they can be tested independently.

### UI integration

Update the export control so it can select the target format and, for STL, collect thickness parameters.

Recommended parameters:

- `disc thickness` in mm
- `mark thickness` in mm

The laser export path does not need extra thickness controls in v1 because it remains a 2D output.

## Data Flow

1. The user chooses `Laser SVG` or `3D STL`.
2. The current dial state is normalized into shared geometry.
3. The chosen exporter consumes that geometry.
4. The exporter returns a file payload and filename.
5. The UI downloads the generated file.

This keeps the exporter logic isolated from the button/dialog logic.

## STL Geometry Model

The STL output should be built from two heights:

- base height = disc thickness
- relief height = mark thickness

Model interpretation:

- base disc: a cylinder or circular slab with the current dial diameter
- holes: cutouts subtract volume through the full disc thickness
- marks: raised features with thickness `mark thickness`
- labels: raised text outlines with thickness `mark thickness`

The resulting mesh should share the same XY footprint as the source dial and extend only in Z.

## Laser Encoding Model

Use color-coded strokes as the primary machine-readable distinction between operations.

Suggested mapping:

- cut geometry: one stroke color
- engrave geometry: a different stroke color

The exporter should keep the geometry separate enough that CAM tools can assign cut and engrave passes without manual cleanup.

Because labels are converted to paths, the engrave pass can treat text consistently across machines and fonts.

## Error Handling

- If the dial has no exportable SVG content, the exporter should fail with a clear user-facing error.
- If the STL geometry cannot be built into a watertight mesh, export should fail rather than produce a partial file.
- If thickness values are invalid, the UI should reject them before export or normalize them to safe defaults.

## Testing Plan

### Unit tests

- Laser export includes cut geometry, engraved geometry, and vectorized labels.
- Laser export uses the expected stroke-color encoding for cut versus engrave.
- STL export produces a base disc with through-holes for cutouts.
- STL export adds marks and labels as raised geometry.
- Thickness values affect STL height in the expected way.

### Integration tests

- Export menu lets the user choose between `Laser SVG` and `3D STL`.
- Choosing STL reveals thickness inputs.
- Choosing Laser SVG keeps the existing 2D export flow.

### Manual validation

- Open the laser SVG in a CAM workflow and verify cut and engrave operations are separable.
- Open the STL in a slicer and verify the disc, holes, and raised features look correct.

## Risks and Mitigations

### Risk: STL mesh generation is more complex than SVG export

Mitigation: keep v1 geometry simple and avoid exotic boolean operations beyond disc subtraction and top-face reliefs.

### Risk: Laser CAM tools interpret colors differently

Mitigation: keep the color mapping fixed and documented, and keep the SVG structure simple.

### Risk: Text rendering differs across machines

Mitigation: convert labels to vector outlines before export.

### Risk: Users may expect laser export to also be vector-only without encoding conventions

Mitigation: keep the color convention explicit in the exporter and document it in the UI copy later.

## Open Questions Resolved by This Spec

- The user wants both export targets available.
- Laser export should include everything needed for cutting and engraving.
- Laser cutouts and the disc are cut operations.
- Mark lines and labels are engraved operations.
- Laser labels should be converted to vector outlines.
- STL should use a disc thickness for the base and a separate mark thickness for raised features.
