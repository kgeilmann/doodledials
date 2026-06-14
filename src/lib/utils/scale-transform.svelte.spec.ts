import { SVG, type Svg, type G } from '@svgdotjs/svg.js';
import { describe, expect, it } from 'vitest';
import { combineDoodledial, parseSvgPaths } from './doodledial';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
	<path id="shape-a" d="M 40 40 L 80 40 L 80 80 L 40 80 Z" />
</svg>`;

function buildFixture(): { content: SVGContent; layers: Layer[] } {
	const parsed = parseSvgPaths(SAMPLE_SVG);
	return {
		content: { raw: parsed.updatedSvg, filename: 'sample.svg' },
		layers: parsed.layers.map((l) => ({
			id: l.id,
			name: l.name,
			index: l.index,
			visible: true,
			rotation: 0
		}))
	};
}

const BASE_CONFIG: DialConfig = {
	diameter: 120,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	sizeToFit: true,
	centerHoleDiameter: 0.5,
	centerMarkType: 'hole',
	pathLabelFontSize: 10,
	titleFontFamily: 'sans-serif'
};

function getBBox(el: unknown): { cx: number; cy: number; width: number; height: number } {
	return (el as { bbox: () => { cx: number; cy: number; width: number; height: number } }).bbox();
}

function getParent(el: unknown): unknown {
	return (el as { parent: () => unknown }).parent();
}

function getTransformMatrix(el: unknown): {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
} {
	const transform = String((el as { attr: (name: string) => unknown }).attr('transform') || '');
	if (!transform) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
	const match = transform.match(/matrix\(([^)]+)\)/);
	if (!match) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
	const [a, b, c, d, e, f] = match[1].split(/[ ,]+/).map(Number);
	return { a, b, c, d, e, f };
}

function multiplyMatrices(
	a: { a: number; b: number; c: number; d: number; e: number; f: number },
	b: { a: number; b: number; c: number; d: number; e: number; f: number }
): { a: number; b: number; c: number; d: number; e: number; f: number } {
	return {
		a: a.a * b.a + a.c * b.b,
		b: a.b * b.a + a.d * b.b,
		c: a.a * b.c + a.c * b.d,
		d: a.b * b.c + a.d * b.d,
		e: a.a * b.e + a.c * b.f + a.e,
		f: a.b * b.e + a.d * b.f + a.f
	};
}

describe('scale transform center', () => {
	it('wrapper group should have scale transform about disc center', () => {
		const { content, layers } = buildFixture();
		const cx = 100;
		const cy = 100;

		const svg = combineDoodledial(content, { ...BASE_CONFIG, scale: 1.5 }, layers, null, null, {
			includePathLabels: false,
			includeHighlighting: false,
			respectLayerVisibility: false,
			applyDiameter: false,
			useCrosshair: false
		});
		const doc = SVG(svg) as Svg;
		const cutout = doc.findOne('.cutout')!;

		// Cutout should still have its own normalization transform
		const cutoutTransform = String(cutout.attr('transform') || '');
		expect(cutoutTransform).toMatch(/matrix/);

		// The wrapper (parent of cutout) should have the scale+offset transform
		const wrapper = getParent(cutout);
		expect(wrapper).not.toBeNull();
		const wrapperTransform = getTransformMatrix(wrapper);

		// Scale factor should be 1.5
		expect(wrapperTransform.a).toBeCloseTo(1.5, 3);
		expect(wrapperTransform.d).toBeCloseTo(1.5, 3);

		// Scale about (cx, cy) = (100, 100): translate(100,100) * scale(1.5) * translate(-100,-100)
		// = matrix(s, 0, 0, s, cx*(1-s), cy*(1-s)) = [1.5, 0, 0, 1.5, -50, -50]
		expect(wrapperTransform.e).toBeCloseTo(cx * (1 - 1.5), 0);
		expect(wrapperTransform.f).toBeCloseTo(cy * (1 - 1.5), 0);
	});

	it('cutout center should stay at disc center when scale changes with zero offset', () => {
		const { content, layers } = buildFixture();

		function renderedCenter(svgStr: string): { x: number; y: number } {
			const doc = SVG(svgStr) as Svg;
			const cutout = doc.findOne('.cutout')!;
			const wrapper = getParent(cutout);
			const layer = getParent(wrapper) as G;

			const localBox = getBBox(cutout);
			const cm = getTransformMatrix(cutout);
			const wm = getTransformMatrix(wrapper);
			const lm = getTransformMatrix(layer);

			const combined = multiplyMatrices(lm, multiplyMatrices(wm, cm));
			return {
				x: combined.a * localBox.cx + combined.c * localBox.cy + combined.e,
				y: combined.b * localBox.cx + combined.d * localBox.cy + combined.f
			};
		}

		const at1 = renderedCenter(
			combineDoodledial(content, { ...BASE_CONFIG, scale: 1 }, layers, null, null, {
				includePathLabels: false,
				includeHighlighting: false,
				respectLayerVisibility: false,
				applyDiameter: false,
				useCrosshair: false
			})
		);

		const at15 = renderedCenter(
			combineDoodledial(content, { ...BASE_CONFIG, scale: 1.5 }, layers, null, null, {
				includePathLabels: false,
				includeHighlighting: false,
				respectLayerVisibility: false,
				applyDiameter: false,
				useCrosshair: false
			})
		);

		expect(at1.x).toBeCloseTo(100, 0);
		expect(at1.y).toBeCloseTo(100, 0);
		expect(at15.x).toBeCloseTo(100, 0);
		expect(at15.y).toBeCloseTo(100, 0);
	});

	it('cutout size increases with scale', () => {
		const { content, layers } = buildFixture();

		function renderedSize(svgStr: string): { w: number; h: number } {
			const doc = SVG(svgStr) as Svg;
			const cutout = doc.findOne('.cutout')!;
			const wrapper = getParent(cutout);
			const layer = getParent(wrapper) as G;

			const localBox = getBBox(cutout);
			const cm = getTransformMatrix(cutout);
			const wm = getTransformMatrix(wrapper);
			const lm = getTransformMatrix(layer);

			const combined = multiplyMatrices(lm, multiplyMatrices(wm, cm));
			return { w: localBox.width * combined.a, h: localBox.height * combined.d };
		}

		const at1 = renderedSize(
			combineDoodledial(content, { ...BASE_CONFIG, scale: 1 }, layers, null, null, {
				includePathLabels: false,
				includeHighlighting: false,
				respectLayerVisibility: false,
				applyDiameter: false,
				useCrosshair: false
			})
		);

		const at15 = renderedSize(
			combineDoodledial(content, { ...BASE_CONFIG, scale: 1.5 }, layers, null, null, {
				includePathLabels: false,
				includeHighlighting: false,
				respectLayerVisibility: false,
				applyDiameter: false,
				useCrosshair: false
			})
		);

		expect(at15.w).toBeCloseTo(at1.w * 1.5, 1);
		expect(at15.h).toBeCloseTo(at1.h * 1.5, 1);
	});
});
