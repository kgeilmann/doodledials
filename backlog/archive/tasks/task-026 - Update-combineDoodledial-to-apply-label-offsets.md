---
id: TASK-026
title: Update combineDoodledial to apply label offsets
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
updated_date: '2026-06-05 18:44'
labels: []
dependencies: []
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Modify combineDoodledial in src/lib/utils/doodledial.ts to apply labelOffsetX and labelOffsetY when positioning path labels
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Locate combineDoodledial Function

- File: `src/lib/utils/doodledial.ts`
- Function starts at line 99
- Path label positioning is in the forEach loop (lines 116-145)
- Specifically, path label translation happens at lines 137-139

### 2. Analyze Current Path Label Handling

Current code (lines 135-139):

```typescript
const offsetXPx = config.offsetX * MM_TO_PX;
const offsetYPx = config.offsetY * MM_TO_PX;
const pathLabel = doc.findOne('#path-label-' + layer.id) as Text;
pathLabel.translate(offsetXPx * config.scale, offsetYPx * config.scale);
svgLayer.add(pathLabel);
```

The path label is translated by the global config offset values. This handles moving all path content. We need to ADD the layer-specific label offset on top of this.

### 3. Add Label Offset Application

Modify the path label translation code to include label offset:

```typescript
svgLayer.children().forEach((c) => {
	if (c.svg().startsWith('<path')) {
		c.scale(config.scale, max / 2, max / 2).translate(
			config.offsetX * MM_TO_PX,
			config.offsetY * MM_TO_PX
		);

		const offsetXPx = config.offsetX * MM_TO_PX;
		const offsetYPx = config.offsetY * MM_TO_PX;
		const pathLabel = doc.findOne('#path-label-' + layer.id) as Text;

		// Apply label offset if present (in pixels, already in SVG coordinate space)
		const labelOffsetX = layer.labelOffsetX || 0;
		const labelOffsetY = layer.labelOffsetY || 0;

		pathLabel.translate(
			offsetXPx * config.scale + labelOffsetX,
			offsetYPx * config.scale + labelOffsetY
		);
		svgLayer.add(pathLabel);
	}
});
```

Note: The label offset values from the store are in screen pixels (user drag coordinates), but the SVG coordinates might need conversion depending on the SVG scale. Looking at the current implementation, the translation is applied in SVG coordinate space, so we should apply the label offsets directly since they're calculated from the rendered position.

### 4. Consideration for Scale

The label offset is tracked in screen pixel deltas during dragging, but when applied to the SVG, we need to consider if it should be scaled. Looking at how other offsets work:

- `config.offsetX/Y` are in mm and converted to pixels then scaled
- Label offsets are tracked as raw pixel deltas from the user's mouse movement

For simplicity, we can apply the label offset directly. If there's a mismatch between screen pixels and SVG coordinates, we may need to adjust. The scale factor is already applied to the config offset translation, so we could optionally scale the label offset too:

```typescript
pathLabel.translate(
	offsetXPx * config.scale + labelOffsetX * config.scale,
	offsetYPx * config.scale + labelOffsetY * config.scale
);
```

### 5. Dependencies

- TASK-020: Layer interface has labelOffsetX/Y fields
- TASK-021: Store provides setLayerLabelOffset method

### 6. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
- Test that dragged labels appear in correct positions in the preview
<!-- SECTION:PLAN:END -->
