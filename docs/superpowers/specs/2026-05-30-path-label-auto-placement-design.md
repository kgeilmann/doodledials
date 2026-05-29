# Path Label Auto Placement Design

Date: 2026-05-30
Status: Draft for review

## Goals

- Path labels must never collide with cutouts, other path labels, mark lines, or mark labels.
- Path labels should stay close to their own cutout/path.
- Path labels stay rotated with their owning layer (current behavior remains).
- If no valid position exists within bounds, mark placement error for manual fix.

## Non-goals

- No global solver or stochastic optimizer for labels.
- No axis-aligned-only collision acceptance logic.
- No silent fallback placement outside configured search bounds.

## Constraints and Decisions

- Placement strategy: deterministic radial candidate search near each path anchor.
- Cutout collision check: raster mask (same raster resolution path as overlap/optimizer pipeline).
- Other collision checks: oriented bounding box (OBB) checks, not axis-aligned checks.
- Failure mode: status `error` with reason `no-valid-position-within-radius`.

## Trigger Model

### Auto placement runs on

- New SVG upload / parse.
- Global offset changes.
- Global scale changes.
- Manual reset-to-auto action for a label.

### Auto placement does not run on

- Layer rotation changes.
- Layer visibility toggles.
- Active manual drag interactions.

### Runtime policy

- Debounce retriggers from offset/scale input (target 80-120ms).
- Single-flight solve: one active run at a time.
- If retrigger occurs during solve, queue one rerun with latest state.
- Deterministic ordering by layer index.

## Architecture

### Core utility

Add a dedicated utility module (for example under `src/lib/utils/`) to compute auto placements for labels in one pass:

- Input: current composed geometry context, layers, config, and current label modes.
- Output per layer:
  - `labelOffsetX`, `labelOffsetY`
  - `status`: `placed | error`
  - `reason?`: `no-valid-position-within-radius`

### Store integration

Extend state in `src/lib/stores/doodledial.svelte.ts`:

- Per-layer placement mode: `auto | manual`.
- Per-layer placement status: `placed | error` (+ reason).
- Manual drag sets mode to `manual` for that layer.
- Reset action sets mode back to `auto` and retriggers placement for that layer.

### Rendering integration

- Keep rendering transform behavior where labels rotate with layer groups.
- Apply computed offsets exactly once in final combined SVG path label translation.

## Candidate Generation

For each auto-mode layer:

1. Build an anchor near the path/cutout based on path bbox and preferred outside side.
2. Generate candidate offsets in deterministic rings around anchor:
   - radius sequence from small to max radius
   - angle sequence biased to preferred side, then symmetric spread
3. Evaluate candidates in order; first valid candidate wins.

## Collision Model

All acceptance checks happen in final transformed SVG user space.

## 1) Cutout-label collision (raster)

- Build cutout raster mask from composed geometry using the same raster-resolution path used by overlap/optimizer detection.
- Build candidate label raster mask from candidate OBB in the same raster coordinate system.
- Collision if any overlapping active pixels are found above alpha threshold.

## 2) Label-label collision (vector OBB)

- Candidate label OBB vs already-accepted path label OBBs.
- Use SAT overlap with configurable safety padding.

## 3) Label-mark-line collision (vector)

- Candidate OBB vs mark line with clearance thickness.
- Reject on intersection or distance under clearance threshold.

## 4) Label-mark-label collision (vector OBB)

- Candidate OBB vs mark-label OBB via SAT.
- Same safety padding policy as label-label.

## Broad/Narrow behavior

- No axis-aligned-only acceptance.
- Optional AABB broad-phase may be used purely for performance prefiltering.
- Final acceptance always uses raster (cutout) and OBB/vector narrow checks.

## Failure Handling

- If no valid candidate within max radius:
  - keep existing/manual position unchanged
  - set status `error`
  - set reason `no-valid-position-within-radius`
  - surface manual-fix-needed indicator in UI

## State Machine

- `idle`: no pending placement work
- `pending`: retrigger queued by input change
- `solving`: active auto-placement run
- `stale`: newer trigger arrived during solving
- `done`: solve completed and state updated

Transitions:

- `idle -> pending -> solving`
- `solving + trigger -> stale`
- `solving done + stale -> solving` (rerun latest)
- `solving done + no stale -> done -> idle`

## Testing Plan

### Unit tests

- Candidate generation order is deterministic.
- Cutout raster collision rejects overlapping candidate.
- OBB checks reject label-label, label-mark-label, and label-mark-line collisions.
- Failure path sets `error` state and reason.
- Manual mode labels are not overwritten by auto solver.

### Integration tests

- On SVG load, auto placement computes offsets for auto labels.
- Offset/scale changes retrigger placement.
- Rotation and visibility changes do not retrigger placement.
- Reset-to-auto retriggers only target label placement flow.

### UI tests (Playwright)

- Layer with impossible placement shows manual-fix-needed state.
- Manual drag switches mode to `manual` and survives retrigger events.
- Reset-to-auto returns label to solver-controlled placement.

## Open Parameters

- Max search radius (default to be chosen during implementation).
- Candidate ring density (angle samples per ring).
- SAT padding and line clearance thresholds.
- Alpha threshold for raster overlap checks.
- Debounce duration (target 80-120ms).

## Rollout Notes

- Keep existing manual editing UX intact.
- Introduce status indicators before enforcing strict failures in export paths.
- Add logging hooks in dev mode for candidate rejection diagnostics.
