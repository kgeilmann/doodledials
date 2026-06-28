# Laser SVG Export Defaults — Design Spec

## Goal

Allow users to set global defaults for the laser SVG export numbering scheme and title format, persisted across sessions. These become the pre-selected values when the export dialog opens, while still being overridable per-export.

## Changes

### 1. Global Config Store (`src/lib/stores/global-config.svelte.ts`)

Add two new persisted fields:

| Field                    | Type                                       | Default        |
| ------------------------ | ------------------------------------------ | -------------- |
| `defaultNumberingScheme` | `'continuous' \| 'independent'`            | `'continuous'` |
| `defaultTitleFormat`     | `'none' \| 'name' \| 'numbered' \| 'both'` | `'none'`       |

Wire through `PersistedConfig` interface, `DEFAULTS`, class `$state` properties, `_load()`, `_save()`, and `reset()`.

### 2. Settings Dialog (`src/lib/components/GlobalConfigDialog.svelte`)

Add two dropdown controls in the **Export** tab, below the Default Export Format radio group:

- **Default numbering scheme** — select with options: Continuous, Independent
- **Default title format** — select with options: As-is, Name Only, Numbered Only, Name & Numbered

Use the same draft-then-commit pattern as existing fields. Wire into `handleReset` and `handleOK`.

### 3. Export Dialog (`src/lib/components/ExportButton.svelte`)

In `openDialog()`, initialize `numberingScheme` and `titleMode` from `globalConfig.defaultNumberingScheme` and `globalConfig.defaultTitleFormat` instead of hardcoded values. The per-export overrides remain unchanged — only the initial defaults change.

### 4. Tests (`src/lib/stores/global-config.spec.ts`)

Add tests following the existing pattern (defaults, persist/restore, reset) for both new fields.

### Out of Scope

- Changes to `laser-svg-export.ts` or `LaserExportOptions` — these already accept `numberingScheme` and `titleMode` dynamically.
