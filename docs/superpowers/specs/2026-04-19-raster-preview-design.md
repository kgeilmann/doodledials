# Raster Preview Design

## Overview

Add a modal preview that shows the disc rendered as a raster (PNG) image at print quality (300 DPI). User triggers it via a button click.

## UI Components

### Button

- Location: Top-right area, next to Export button
- Label: "Preview Raster"
- Icon: Optional image/photo icon
- State: Disabled when no SVG content is loaded

### Modal

- Overlay: Semi-transparent black background (`rgba(0,0,0,0.5)`)
- Container: White rounded box with shadow, centered on screen
- Header: "Raster Preview" title + close (X) button
- Body: The raster image, centered
- Close: Click outside modal or X button

## Raster Generation

### Resolution

- 300 DPI (print quality)
- Size calculated from configured diameter:
  - `width = (diameter_mm / 25.4) * 300`
  - `height = width` (square, since disc is circular)

### Process

1. Get the combined SVG from store
2. Create an off-screen canvas at target dimensions
3. Draw SVG to canvas using `drawImage` with SVG as source
4. Convert canvas to blob/dataURL
5. Display in modal

## Acceptance Criteria

- [ ] Button appears next to Export button
- [ ] Button is disabled when no SVG is loaded
- [ ] Modal opens on button click
- [ ] Modal shows raster image at 300 DPI
- [ ] Modal closes on X click or outside click
- [ ] Works with all layer configurations (rotation, labels, etc.)
