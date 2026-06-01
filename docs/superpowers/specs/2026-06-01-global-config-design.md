# Global Configuration Dialog

Store disc diameter and feature flags in localStorage with a UI dialog.

## Architecture

### `src/lib/stores/global-config.svelte.ts`

A `GlobalConfigStore` class with `$state` fields for `diameter`, `pathLabelOptimizerEnabled`, and `dialogOpen`. On construction it reads from `localStorage` (key `doodledial:config`) falling back to defaults. An `$effect` in an `$effect.root` writes back on every change. Only `diameter` and `pathLabelOptimizerEnabled` are persisted; `dialogOpen` is UI-only.

- Defaults: `{ diameter: 200, pathLabelOptimizerEnabled: true }`
- Methods: `open()`, `close()`, `reset()` (restores defaults)
- Exported singleton: `export const globalConfig = new GlobalConfigStore()`

### `src/lib/components/GlobalConfigDialog.svelte`

Modal dialog matching the existing optimizer dialog pattern (backdrop overlay, close button, same Tailwind classes).

- **Header**: "Global Settings" + close button
- **Disc Diameter**: number input + range slider (min 50, max 200), bound to `globalConfig.diameter`
- **Path Label Optimizer**: toggle switch with label + description, bound to `globalConfig.pathLabelOptimizerEnabled`
- **Footer**: "Reset Defaults" button, "Close" button
- Visibility controlled by `globalConfig.dialogOpen`

### Modifications to existing files

**`src/routes/+page.svelte`** — Add a gear icon button to the top action bar (between the optimizer buttons and the export button). It calls `globalConfig.open()`. Render `<GlobalConfigDialog />` near the other dialog sections.

**`src/lib/components/DiameterControl.svelte`** — Remove the diameter slider and number input. Keep offsetX, offsetY, scale controls.

**`src/lib/stores/doodledial.svelte.ts`** — Replace the `VITE_ENABLE_AUTO_PATH_LABEL_PLACEMENT` env var check with `globalConfig.pathLabelOptimizerEnabled`. The `setDiameter` method also writes to `globalConfig.diameter`.

## Data Flow

```
User changes diameter in dialog
  → globalConfig.diameter updated
    → $effect writes to localStorage
    → doodledialStore.setDiameter() called
      → DialConfig updated → preview re-renders

User toggles feature flag
  → globalConfig.pathLabelOptimizerEnabled updated
    → $effect writes to localStorage
    → doodledialStore behavior changes (guards read from the new source)
```

## Persistence

- Key: `doodledial:config`
- Serialization: `JSON.stringify({ diameter, pathLabelOptimizerEnabled })`
- Read on app load, merge with DEFAULTS (survives schema changes)
- No migration strategy needed for initial release

## Test Plan

- `global-config.svelte.ts`: verify defaults, localStorage round-trip, reset
- `GlobalConfigDialog.svelte`: render test, toggle interaction, slider interaction
- `DiameterControl.svelte`: verify diameter controls are removed
