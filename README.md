# Doodle Dials

This project is a specialized SVG editor for creating doodle dials: circular drawing templates with numbered cutouts.

## What Is A Doodle Dial?

A doodle dial is used in rotation steps:

1. Fix the dial to a piece of paper at its center.
2. Rotate the dial so cutout mark 1 is at 12 o'clock.
3. Fill the visible cutout.
4. Rotate to mark 2 at 12 o'clock and fill again.
5. Continue until all cutouts are filled.

The final image appears from the combined strokes across all rotation positions.

## Historical Note

This editor is inspired by the British Rotadraw toy from 1969 (not the later American release). The tool focuses on the same core idea: sequential rotational alignment and layered cutout drawing to reveal a complete picture.

## Development

Install dependencies:

```sh
pnpm install
```

Start a development server:

```sh
pnpm dev

# or start and open a browser tab
pnpm dev -- --open
```

## Build

Create a production build:

```sh
pnpm build
```

Preview the production build:

```sh
pnpm preview
```
