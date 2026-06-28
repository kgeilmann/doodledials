# Glossary

This project is a specialized editor for creating **doodle dials** — circular drawing templates
with numbered cutouts that are rotated sequentially to reveal a complete picture.

## Core Concepts

| Term             | Definition                                                                                                                                         | Code name                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Dial**         | The circular drawing template, also historically called a "doodle dial" or "Rotodraw". The physical circular base with cutouts, marks, and labels. | `dial*` (was `disc*`)                |
| **Dial Title**   | Arbitrary title text on the dial face.                                                                                                             | `dialTitle` (was `discTitle`)        |
| **Layer**        | A single cutout element with its own rotation, visibility, and index. Each layer represents one stroke/position in the drawing sequence.           | `Layer`                              |
| **Group**        | A named, colored collection of layers (from SVG `<g>` groups).                                                                                     | `LayerGroup` / `Group`               |
| **Cutout**       | The visible opening/path in a layer — the shape that gets filled when the dial is rotated into position.                                           | `.cutout`                            |
| **Mark**         | The alignment tick at 12 o'clock position used to align the dial for each rotation step.                                                           | `.mark-line`                         |
| **Mark Label**   | Number label beside the mark line indicating the layer index.                                                                                      | `.mark-label` (was `.layer-label`)   |
| **Cutout Label** | Number label near the cutout path showing the layer index.                                                                                         | `.cutout-label` (was `.path-label`)  |
| **Start Marker** | A small triangle on the first layer's mark to help identify the starting position.                                                                 | `.start-marker` (was `.home-notch`)  |
| **Center Style** | How the dial center is rendered: hole, crosshair, or none.                                                                                         | `CenterStyle` (was `CenterMarkType`) |

## Solvers (formerly Optimizers)

| Term                      | Definition                                                                                                 | Code name                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Force-Directed Solver** | Iterative rotation layout solver using force simulation to minimize cutout overlap.                        | `force-directed` (was `optimizer`)                            |
| **Bruteforce Solver**     | Exhaustive search solver that tries all rotation combinations to find feasible layouts.                    | `bruteforce` (was `optimizer`)                                |
| **Layout**                | An assignment of rotation angles to all layers.                                                            | `layout`                                                      |
| **Feasible Solution**     | A layout with no cutout overlaps (above a minimum gap threshold).                                          | `feasibleSolution`                                            |
| **Solver Tuning**         | Parameters controlling force-directed solver behavior (force weights, step sizes, etc.).                   | `tuning`                                                      |
| **Auto Label Placement**  | Automatically positions cutout labels to avoid overlapping with dial cutouts (was "Path Label Optimizer"). | `autoLabelPlacementEnabled` (was `pathLabelOptimizerEnabled`) |

## Export Formats

| Term                  | Definition                                                                        | Code name     |
| --------------------- | --------------------------------------------------------------------------------- | ------------- |
| **Preview SVG**       | Screen-viewable SVG rendering of the dial.                                        | `preview-svg` |
| **Laser SVG**         | SVG optimized for laser cutting, with cut/engrave CSS classes.                    | `laser-svg`   |
| **STL**               | 3D-printable model of the dial.                                                   | `stl`         |
| **Raised / Recessed** | Whether labels and marks are raised (embossed) or recessed (engraved) in the STL. | `raised`      |

## Detection

| Term                       | Definition                                                                    | Code name           |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------- |
| **Overlap**                | Cutouts from different layers occupying the same pixels (too close together). | `overlap`           |
| **Gap / Cutout Clearance** | Minimum spacing required between cutouts.                                     | `gap` / `cutoutGap` |
