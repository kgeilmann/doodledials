# Disclaimer

This repo is 98% AI generated using a weird mix of models, skills, and tools. 

It's just a fun little educational project I worked on, to get my hands dirty with AI and Vibe Coding. Therfor, don't judge the code or expect it to be "good" in any sense. 

It works for me and hopefully it works for you.

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

This editor is inspired by the British Rotodraw toy from 1969. The tool focuses on the same core idea: sequential rotational alignment and layered cutout drawing to reveal a complete picture.

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
