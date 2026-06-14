# Font Selection for Labels & Title

## Summary

Allow users to choose fonts for two text categories — **labels** (mark labels + path labels, always same font) and **disc title** — via dropdowns in both global settings (defaults) and per-disc sidebar settings.

## Font Categories

| Category       | Elements                                                    | Default      | Scope                              |
| -------------- | ----------------------------------------------------------- | ------------ | ---------------------------------- |
| **Label Font** | Mark labels (disc edge numbers), Path labels (near cutouts) | `monospace`  | Global default + per-disc override |
| **Title Font** | Disc title text                                             | `sans-serif` | Global default + per-disc override |

## Data Model

### `DialConfig` (per-disc, in `stores/doodledial.svelte.ts`)

```typescript
export interface DialConfig {
	// ... existing fields
	labelFontFamily: string; // default: globalConfig.labelFontFamily || 'monospace'
	titleFontFamily: string; // default: globalConfig.titleFontFamily || 'sans-serif'
}
```

### `GlobalConfig` (persisted, in `stores/global-config.svelte.ts`)

```typescript
export interface GlobalConfig {
	// ... existing fields
	labelFontFamily: string; // default: 'monospace'
	titleFontFamily: string; // default: 'sans-serif'
}
```

## Font Options

`monospace`, `sans-serif`, `serif`, `Arial`, `Helvetica`, `Times New Roman`, `Courier New`, `Georgia`, `Verdana`, `Trebuchet MS`, `Impact`

## Dropdown Locations

### Global Config Dialog (`GlobalConfigDialog.svelte`)

- "Label Font" dropdown, "Title Font" dropdown
- Changes auto-save via existing `globalConfig` store effect

### Sidebar Disc Settings (`OffsetScaleControl.svelte`)

- "Label Font" dropdown, "Title Font" dropdown
- Each shows the effective value (global default if not overridden per-disc)

## Value Resolution

```
renderedFont = config.labelFontFamily ?? globalConfig.labelFontFamily ?? 'monospace'
```

## Files Changed

| File                                           | Change                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/doodledial.ts`                  | Add `labelFontFamily`, `titleFontFamily` to `DialConfig`                                                                |
| `src/lib/stores/global-config.svelte.ts`       | Add `labelFontFamily: 'monospace'`, `titleFontFamily: 'sans-serif'` to defaults                                         |
| `src/lib/stores/doodledial.svelte.ts`          | Add `setLabelFontFamily()`, `setTitleFontFamily()` setters; initialize from global config                               |
| `src/lib/components/OffsetScaleControl.svelte` | Add two `<select>` dropdowns for per-disc font overrides                                                                |
| `src/lib/components/GlobalConfigDialog.svelte` | Add two `<select>` dropdowns for global defaults                                                                        |
| `src/lib/utils/doodledial.ts`                  | Use `config.labelFontFamily` in `createMark()` and `createPathLabel()`; use `config.titleFontFamily` in title rendering |
| `src/lib/utils/doodledial-save.ts`             | Include `labelFontFamily`, `titleFontFamily` in serialized metadata                                                     |

## Non-Goals

- Font selection for STL export (Three.js uses Helvetiker internally)
- Custom / system font enumeration
- Font preview in dropdown
- "Use global default" toggle (per-disc dropdown always shows the effective value)
