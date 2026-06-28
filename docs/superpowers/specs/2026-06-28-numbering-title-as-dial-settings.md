# Move Numbering Scheme and Title Format from Export to Dial Settings

## Problem

`numberingScheme` (`'continuous' | 'independent'`) and `titleFormat` (`'none' | 'name' | 'numbered' | 'both'`) are currently configured per-export in the export dialog and as global defaults. These properties are intrinsic to how a dial is structured and labeled, so they should be dial-level settings instead.

## Design

### Types (`src/lib/types/doodledial.ts`)

Add two fields to `DialConfig`:

```typescript
interface DialConfig {
	// ... existing fields
	numberingScheme: 'continuous' | 'independent';
	titleFormat: 'none' | 'name' | 'numbered' | 'both';
}
```

`DEFAULT_DIAL_CONFIG` gets matching defaults.

### Store (`src/lib/stores/doodledial.svelte.ts`)

- Initialize `config.numberingScheme` and `config.titleFormat` from `globalConfig.defaultNumberingScheme` / `globalConfig.defaultTitleFormat`
- Add setters `setNumberingScheme()` and `setTitleFormat()` on the store
- The `GlobalConfigLike` interface gains these for DI purposes

### Global Config (`src/lib/stores/global-config.svelte.ts`)

- Keep `defaultNumberingScheme` and `defaultTitleFormat` — they now serve as "new dial defaults" rather than "export defaults"
- No field changes needed

### Dial Settings UI

Add two `<select>` dropdowns to the Dial Settings panel (`OffsetScaleControl.svelte`) for numbering scheme and title format, matching the styling of existing controls.

### Export (`src/lib/components/ExportButton.svelte`)

- Remove `numberingScheme` and `titleMode` state variables
- Remove the corresponding `<select>` controls from the export dialog
- In `handleExport()`, pass `doodledialStore.config.numberingScheme` and `doodledialStore.config.titleFormat` to the export function

### Export Function (`src/lib/utils/laser-svg-export.ts`)

- Remove `numberingScheme` and `titleMode` from `LaserExportOptions`
- Read from `DialConfig` instead (it's already a parameter)
- Update `LaserExportOptions` interface and all references

### Global Config Dialog (`src/lib/components/GlobalConfigDialog.svelte`)

- Remove the numbering scheme and title format controls from the export tab
- These remain only as global defaults in the store itself (not editable through UI unless they're moved to the default-dial tab — but keeping them off the UI is fine since they're obscure enough to just use sensible hard defaults)

### Files Not Changed

- `preview-svg-export.ts` — doesn't use numbering/title
- `stl-export.ts` — doesn't use numbering/title
- `multi-group-svg-export.ts` — doesn't use numbering/title
- Tests will be updated to reflect new source

## Migration

No data migration needed — default values (`'continuous'`, `'none'`) match existing behavior. Old persisted global config values will still load but have no effect once the UI controls are removed.
