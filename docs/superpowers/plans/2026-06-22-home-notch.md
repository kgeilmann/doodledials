# Home Notch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small filled triangle (home notch) just inside the outer disc edge at 12 o'clock to make the start position easy to find.

**Architecture:** Add a `<polygon class="home-notch">` to the `disc-elements` group in `parseSvgPaths()`. Adding it there means it becomes part of `content.raw` and survives all transforms in `combineDoodledial()`. In the laser export, `.home-notch` gets the engrave class like other reference markings.

**Tech Stack:** TypeScript, @svgdotjs/svg.js

---

### Task 1: Add home notch to disc elements

**Files:**
- Modify: `src/lib/utils/doodledial.ts:93-130`

- [ ] **Step 1: Add the home-notch polygon after the center-hole circle**

Add a filled triangle polygon to the `discElements` group, just inside the disc outer edge at 12 o'clock, after the `#center-hole` circle creation (after line 123):

```typescript
const cx = maxImageDimension / 2;
const cy = maxImageDimension / 2;
const r = (maxImageDimension * Math.SQRT2) / 2;

discElements
	.polygon([
		[cx, cy - r + 4],        // tip — just inside disc edge
		[cx - 3, cy - r + 10],   // bottom-left
		[cx + 3, cy - r + 10]    // bottom-right
	])
	.fill('black')
	.addClass('home-notch');
```

- [ ] **Step 2: Add CSS rule for `.home-notch`**

After the `#center-hole` rule block, add:

```typescript
style.rule('.home-notch', {
	'pointer-events': 'none'
});
```

- [ ] **Step 3: Run check and lint**

```bash
pnpm check && pnpm lint
```

Expected: No errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat: add home-notch triangle to disc elements"
```

---

### Task 2: Add home-notch engrave class in laser export

**Files:**
- Modify: `src/lib/utils/laser-svg-export.ts:94-97` (after the `.nine-underscore` block)

- [ ] **Step 1: Add `.home-notch` engrave mapping**

After the `.nine-underscore` block (after line 97), add:

```typescript
doc.find('.home-notch').forEach((el) => {
	el.addClass(engraveClassName);
	el.css('fill', engraveColor);
});
```

- [ ] **Step 2: Run check and lint**

```bash
pnpm check && pnpm lint
```

Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/laser-svg-export.ts
git commit -m "feat: engrave home-notch in laser export"
```

---

### Verification

- [ ] **Manual verification**: Open the app, upload an SVG, confirm the home notch appears at 12 o'clock just inside the disc outline.
- [ ] **Export verification**: Export Laser SVG, confirm the notch has `class="home-notch operation-engrave"`.
