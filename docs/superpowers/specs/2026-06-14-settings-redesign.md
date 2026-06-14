# Settings Redesign

## Problem

The current settings architecture has ambiguous scope boundaries, duplication between global and per-disc settings, implicit fallback chains, and optimizer tuning that isn't persisted. The Global Config dialog mixes truly-global preferences with per-disc defaults in a flat list with no organization.

## Design

### Global Settings (persisted to `localStorage`)

Organized into tabbed sections in the Global Config dialog:

| Tab                            | Fields                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Default Disc Settings**      | `diameter`, `centerHoleDiameter`, `centerMarkType`, `titleFontFamily`, `pathLabelFontSize`, `discTitleFontSize` |
| **Default Optimizer Settings** | `optimizerGapDefault`, `bruteforceTimeLimit`                                                                    |
| **Experimental**               | `pathLabelOptimizerEnabled`, `forceDirectedOptimizerEnabled`                                                    |
| **Export**                     | `defaultExportFormat`                                                                                           |

All fields persist across sessions via `localStorage` (unchanged mechanism). `pathLabelFontSize` and `discTitleFontSize` are added as new global fields; other fields already exist.

### Per-Disc Settings (session + SVG metadata)

Organized into labeled sections in the sidebar Disc Settings panel:

| Section        | Fields                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| **Dimensions** | `diameter`                                                               |
| **Image**      | `offsetX`, `offsetY`, `scale`, `sizeToFit`                               |
| **Typography** | `pathLabelFontSize`, `titleFontFamily`, `discTitle`, `discTitleFontSize` |

Per-disc settings are seeded from the global "Default Disc Settings" tab on disc creation, but diverge independently during the session. On save/load via SVG metadata, per-disc values are preserved. The disc title (`discTitle`) has no global default.

### Optimizer Tuning

Remains per-run only — not persisted. The Optimizer Config dialog is unchanged.

### UI Changes

1. **GlobalConfigDialog.svelte**: Flat layout replaced with tabbed interface. Tabs: Default Disc Settings, Default Optimizer Settings, Experimental, Export. "Reset Defaults" resets all tabs.
2. **OffsetScaleControl.svelte**: Sections labeled "Dimensions", "Image", "Typography". Layout changes minimal — just section headers.
3. **+page.svelte**: The inline Title/Font Size controls under "Disc Settings" move into `OffsetScaleControl.svelte` under the Typography section. The `+page.svelte` template renders `OffsetScaleControl` which now includes all per-disc UI fields.

### Types

- **`PersistedConfig`** (global-config.svelte.ts): Add `pathLabelFontSize` and `discTitleFontSize` fields. Add internal section grouping or keep flat storage with tabbed UI.
- **`DialConfig`** (doodledial.ts): Already has all per-disc fields. No type changes needed unless we add `discTitle`/`discTitleFontSize` into it (currently separate store state).
- **`DoodleDialMetadata`** (doodledial-save.ts): Already includes all per-disc fields via the metadata snapshot. No changes needed.

### Data Flow

```
localStorage (PersistedConfig)
  └─ Default Disc Settings tab ──────────────────> per-disc config (on creation)
  └─ Default Optimizer Settings tab ──> optimizer store (fallback defaults)
  └─ Experimental tab ──> feature toggles consumed by label placement / optimizer
  └─ Export tab ──> default export format consumed by ExportButton

Per-disc settings ──> SVG metadata (save/load round-trip)
```

## Implementation Plan

1. Update `global-config.svelte.ts` — add `pathLabelFontSize`, `discTitleFontSize` fields; add defaults; update DEFAULTS
2. Update `GlobalConfigDialog.svelte` — tabbed interface with 4 tabs; move Reset/Cancel/OK outside tabs
3. Update `OffsetScaleControl.svelte` — section headers: Dimensions, Image, Typography
4. Update `+page.svelte` — group Title/Font Size under Typography alongside OffsetScaleControl
5. Verify: `pnpm check`, `pnpm lint`, existing tests pass
