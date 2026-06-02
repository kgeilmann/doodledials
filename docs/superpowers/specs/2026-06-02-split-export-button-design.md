# Split Export Button Design

Date: 2026-06-02
Status: Draft for review

## Summary

Replace the existing Export dropdown button with a **split button**: a single-click main button that exports the default format, plus a chevron that opens a format picker dropdown. The default export format is configurable in the Global Config dialog.

## Goals

- Let the user export their current default format with a single click.
- Let the user pick a different format via a dropdown for one-off exports.
- Make the default format configurable in global preferences.
- Keep the existing STL parameter dialog for STL exports (even when triggered from the main button).

## Non-goals

- No new export formats (laser-svg and stl remain the only two).
- No instant-STL export (STL always requires disc/mark thickness parameters).
- No per-session override that changes the stored default.

## Current State

The export button is a single button ("Export") with a dropdown that toggles two options: "Laser SVG" and "3D STL". There is no concept of a default export format. The Global Config store has no export-format setting.

## User-Facing Behavior

### Split button layout

The export control is a single visual element with two clickable zones:

- **Main button (left)**: labeled "Export" with a small download icon. Clicking this triggers the default export format.
- **Chevron (right)**: a small ▼ button. Clicking this opens a dropdown menu.

Both parts are disabled when `svgContent` is null (no dial loaded).

### Main button behavior

- If the default format is `laser-svg`: downloads the SVG file immediately (no dialog).
- If the default format is `stl`: opens the STL export dialog to collect disc thickness and mark thickness, then downloads on confirmation.

### Dropdown behavior

The dropdown lists both available formats:

- **Laser SVG** — selects and exports laser SVG (one-time, does not change default)
- **3D STL** — opens STL dialog, exports on confirmation (one-time, does not change default)

Selecting a format from the dropdown exports immediately (or opens STL dialog if needed) but **does not** change the stored default format. The default can only be changed through the Global Config dialog.

### Global Config integration

Add a `defaultExportFormat` field to `GlobalConfigStore`:

- Type: `'laser-svg' | 'stl'`
- Default: `'laser-svg'`
- Persisted to `localStorage` alongside existing config fields.

Add a dropdown / radio-group control in `GlobalConfigDialog` for selecting the default export format.

### STL dialog behavior

No changes to the STL dialog. It continues to appear whenever STL is chosen (whether from the main button with STL as default, or from the dropdown).

## Proposed Architecture

### Component changes

**`ExportButton.svelte`** — rewrite to split-button pattern:

- Split into two `<button>` elements visually joined.
- Main button calls `handleDefaultExport()`.
- Chevron button toggles `menuOpen` to show the dropdown.
- Dropdown items call `handleFormatSelection(format)`.
- Both paths eventually call existing `exportLaserSvg()` or `exportStl()`.

**`GlobalConfigDialog.svelte`** — add:

- A section for "Default Export Format" with two radio options.
- Reads/writes `globalConfig.defaultExportFormat`.

### Store changes

**`GlobalConfigStore`** — add to interface:

```typescript
defaultExportFormat: 'laser-svg' | 'stl'; // default: 'laser-svg'
```

## Data Flow

1. User clicks main button → reads `globalConfig.defaultExportFormat`.
2. If `laser-svg`: calls `exportLaserSvg()` → `createDownload()`.
3. If `stl`: opens STL dialog → on confirm, calls `exportStl()` → `createDownload()`.
4. User clicks chevron → dropdown shown.
5. User picks a format → same flow but ignores `defaultExportFormat`.

## Error Handling

- Same as existing: disabled state when no dial loaded.
- Invalid default format value (from corrupted localStorage) defaults to `'laser-svg'`.

## Testing Plan

### Unit tests

- `GlobalConfigStore` loads/saves `defaultExportFormat` correctly.
- `ExportButton` main click exports the correct format based on default.
- Dropdown selection exports the picked format regardless of default.

### E2E tests

- Upload SVG → click main button (default laser-svg) → verify `.svg` download.
- Change default to STL in Global Config → click main button → verify STL dialog opens.
- Click chevron → pick "Laser SVG" → verify `.svg` download without changing default.

### Manual validation

- Both parts are disabled when no dial is loaded.
- STL dialog appears correctly when triggered from main button vs dropdown.
- Default format persists across page reloads.
