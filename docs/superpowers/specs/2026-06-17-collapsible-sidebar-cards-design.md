# Collapsible Sidebar Cards — Design Spec

## Summary

Add collapsible/expandable behavior to the three sidebar cards in the main page
(Upload SVG, Disc Settings, Layer Management) using a reusable `CollapsibleCard`
Svelte component.

## Design Decisions

| Decision                    | Choice                                              |
| --------------------------- | --------------------------------------------------- |
| Which cards are collapsible | All 3 (Upload SVG, Disc Settings, Layer Management) |
| Interaction                 | Click +/- icon button in the card header            |
| Default state               | All expanded                                        |
| State persistence           | None — resets on page reload                        |
| Multiple open at once       | Yes — independent collapse                          |
| Animation                   | Smooth height transition (~200ms ease)              |

## Component: `CollapsibleCard.svelte`

```svelte
<CollapsibleCard {title} {icon} bind:open>
	<!-- body content -->
</CollapsibleCard>
```

**Props:**

- `title: string` — card heading text
- `open: boolean` (default `true`) — collapsed/expanded state

**Slots (snippets in Svelte 5):**

- `icon` — the SVG icon that appears to the left of the title
- `children` (default) — the card body content

**Structure:**

- Outer `<section>` with existing card styling (`bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100`)
- Header row with icon snippet, title, and +/- toggle button
- Body container with CSS `grid-template-rows` transition for smooth height animation

## CSS Transition Strategy

Use `grid-template-rows` transition on the body wrapper:

```css
.grid-collapsible {
	display: grid;
	grid-template-rows: 1fr;
	transition: grid-template-rows 200ms ease;
	overflow: hidden;
}
.grid-collapsible.collapsed {
	grid-template-rows: 0fr;
}
```

An inner `min-height-0` div holds the actual content. This gives a smooth height
animation without needing JS to measure content height.

## Changes to `+page.svelte`

Replace three inline `<section>` card blocks with `<CollapsibleCard>` wrappers:

1. **Upload SVG card** (lines ~31-71) → `Card` with `title="Upload SVG"`, default open
2. **Disc Settings card** (lines ~73-94) → `Card` with `title="Disc Settings"`, default open
3. **Layer Management card** (lines ~96-119) → `Card` with `title="Layer Management"`, conditionally rendered (only when `doodledialStore.svgContent` exists)

Each SVG icon moves into the `icon` snippet slot. Each card's existing inner
content (components, labels, inputs) goes into the `children` slot unchanged.

## New Variables in Page

```ts
let uploadOpen = $state(true);
let settingsOpen = $state(true);
let layersOpen = $state(true);
```

Bound to respective `<CollapsibleCard>` `open` props.
