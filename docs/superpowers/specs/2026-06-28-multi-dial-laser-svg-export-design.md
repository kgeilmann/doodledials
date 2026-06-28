# Design Spec: Multi-dial Laser SVG Export Support

We are extending the laser SVG export feature to better support designs that consist of multiple doodle dials (groups). Specifically, we want to allow users to configure:

1. **Layer Numbering Scheme**: Choose between continuous absolute indices (e.g. 1-12) or independent indices per dial (each starts at 1).
2. **Title Formats**: Choose whether and how the dial name or index is incorporated into the title printed on the dial face.
3. **Dial Selection**: Allow selecting specific dials to export instead of always exporting all of them.

---

## 1. Exporter Changes (`src/lib/utils/laser-svg-export.ts`)

We will update the `LaserExportOptions` interface:

```typescript
export interface LaserExportOptions {
	cutClassName?: string;
	engraveClassName?: string;
	cutColor?: string;
	engraveColor?: string;
	cutStrokeWidth?: number;
	centerStyle?: CenterStyle;
	dialTitle?: string;
	dialTitleX?: number;
	dialTitleY?: number;
	dialTitleFontSize?: number;
	// New options for multi-dials
	numberingScheme?: 'continuous' | 'independent';
	titleMode?: 'none' | 'name' | 'numbered' | 'both';
	selectedGroupIds?: string[];
}
```

In `exportLaserSvgMultiGroup`:

1. Filter the list of `groups` to only include those in `options.selectedGroupIds` (if defined), falling back to all groups that contain visible layers.
2. For each selected group:
   - Filter the layers belonging to that group that are visible.
   - If `options.numberingScheme === 'independent'`, map the layers to a new array where their `index` properties are set to sequential values starting from 1 (preserving their original relative ordering).
   - If `options.numberingScheme === 'continuous'`, preserve the original layer indices.
   - Determine the title to print on the sub-dial based on `options.titleMode`:
     - `'none'`: Empty title.
     - `'name'`: `"[dialTitle] - [group.name]"` (or just `"[group.name]"` if `dialTitle` is blank).
     - `'numbered'`: `"[dialTitle] ([groupIndex]/[totalGroups])"` (or just `"[groupIndex]/[totalGroups]"`).
     - `'both'`: `"[dialTitle] - [group.name] ([groupIndex]/[totalGroups])"`.
   - Call `exportLaserSvgSingle` with the mapped layers and the constructed title.
3. Combine the generated sub-SVGs using `combineMultiGroupSvg`.

---

## 2. UI Changes (`src/lib/components/ExportButton.svelte`)

When `Laser SVG` format is selected:

- Add UI controls for `numberingScheme` (defaulting to `'continuous'`).
- Add UI controls for `titleMode` (defaulting to `'none'` to preserve original behavior, or `'both'`).
- Add checkboxes to select which dial groups to export if `groups.length > 1`.
  - Checkboxes default to all groups selected.
  - Disable the export submit button if no groups are selected.

---

## 3. Test Adjustments (`src/lib/utils/export-formats.svelte.spec.ts`)

We will add tests covering:

- Exporting with independent layer numbering (verifying marks/labels start at 1 on both dials).
- Exporting with continuous layer numbering (verifying marks/labels continue across dials).
- Dynamic title formats (`'name'`, `'numbered'`, `'both'`).
- Exporting a subset of groups (verifying only selected dials are in the output grid).
