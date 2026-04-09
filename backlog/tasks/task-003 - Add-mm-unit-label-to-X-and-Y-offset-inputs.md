---
id: TASK-003
title: Add mm unit label to X and Y offset inputs
status: Done
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 22:48'
labels: []
dependencies: []
priority: medium
ordinal: 300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In DiameterControl.svelte, the X Offset and Y Offset input fields currently don't show a unit label. Add "mm" unit labels next to them similar to how the diameter input has a mm label.

The value has to be interpreted converted to px when applied to the svg, analogous to the disc diameter
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The X Offset input field displays an "mm" unit label next to it
- [x] #2 The Y Offset input field displays an "mm" unit label next to it
- [x] #3 The unit labels match the styling of the existing diameter mm label
- [x] #4 The offset values are correctly converted from mm to px when applied to the SVG
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Phase 1: Add mm unit labels to inputs
- Modify `src/lib/components/DiameterControl.svelte`
- Wrap X Offset input in a flex container with gap-2 (like diameter input at line 72)
- Add `<span class="text-sm text-gray-500">mm</span>` after the X Offset input
- Repeat for Y Offset input

### Phase 2: Fix mm to px conversion
- Modify `src/lib/utils/doodledial.ts` line 106
- Change `translate(config.offsetX, config.offsetY)` to `translate(config.offsetX * MM_TO_PX, config.offsetY * MM_TO_PX)`
- This ensures offset values in mm are correctly converted to pixels

### Phase 3: Testing/verification
- Verify the mm labels appear correctly in the UI
- Test that offset values visually move the SVG content by the correct amount (1mm input should move ~3.78px)
- Ensure the labels match the styling of the diameter mm label
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Verification steps for criteria #4 (mm to px conversion):**

1. Examine `src/lib/utils/doodledial.ts` line 106 - the translate uses `config.offsetX` and `config.offsetY` directly
2. The diameter conversion is done at line 58: `pixelDiameter = (config.diameter * DPI) / MM_PER_INCH` where DPI=96, MM_PER_INCH=25.4
3. The offset conversion constant is at line 74: `MM_TO_PX = DPI / MM_PER_INCH` (approx 3.78 px/mm)
4. Current code passes raw offset values - verify if they need to be multiplied by MM_TO_PX before being applied to the SVG transform
<!-- SECTION:NOTES:END -->
