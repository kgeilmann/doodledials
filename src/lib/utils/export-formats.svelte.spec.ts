import { SVG, type Svg } from '@svgdotjs/svg.js';
import { describe, expect, it } from 'vitest';
import { combineDoodledial, parseSvgPaths } from './doodledial';
import {
	exportLaserSvg,
	exportStl,
	exportPreviewSvg,
	labelToSvgStrokePath,
	labelToThreeShapes
} from './export-formats';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const SAMPLE_RAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
	<path id="shape-a" d="M 20 20 L 50 20 L 50 50 L 20 50 Z" />
	<path id="shape-b" d="M 70 25 L 95 25 L 95 45 L 70 45 Z" />
</svg>`;

function buildExportFixture(): { content: SVGContent; layers: Layer[] } {
	const parsed = parseSvgPaths(SAMPLE_RAW_SVG);
	return {
		content: {
			raw: parsed.updatedSvg,
			filename: 'sample.svg'
		},
		layers: parsed.layers.map((layer) => ({
			id: layer.id,
			name: layer.name,
			index: layer.index,
			visible: true,
			rotation: 0
		}))
	};
}

const SAMPLE_CONFIG: DialConfig = {
	diameter: 120,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	centerHoleDiameter: 2
};

function getParsedGeometry(svg: string): {
	viewBox: string;
	discDiameter: number;
	cutoutBox: { x: number; y: number; width: number; height: number };
} {
	const doc = SVG(svg) as Svg;
	const disc = doc.findOne('#disc');
	const cutout = doc.findOne('.cutout');
	if (!disc || !cutout) {
		throw new Error('Expected parsed SVG to contain disc and cutout');
	}

	const transform = String(cutout.attr('transform') || '');
	const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
	const [a, , , d, e, f] = matrixMatch
		? matrixMatch[1].split(/[ ,]+/).map((value) => Number(value))
		: [1, 0, 0, 1, 0, 0];
	const cutoutBox = (
		cutout as unknown as { bbox: () => { x: number; y: number; width: number; height: number } }
	).bbox();

	return {
		viewBox: doc.attr('viewBox') as string,
		discDiameter: Number(disc.attr('r')) * 2,
		cutoutBox: {
			x: cutoutBox.x * a + e,
			y: cutoutBox.y * d + f,
			width: cutoutBox.width * a,
			height: cutoutBox.height * d
		}
	};
}

describe('export formats', () => {
	it('normalizes differently sized uploads into the same dial frame', () => {
		const smallSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
			<path d="M 20 20 L 40 20 L 40 40 L 20 40 Z" />
		</svg>`;
		const largeSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
			<path d="M 40 40 L 80 40 L 80 80 L 40 80 Z" />
		</svg>`;

		const smallGeometry = getParsedGeometry(parseSvgPaths(smallSource).updatedSvg);
		const largeGeometry = getParsedGeometry(parseSvgPaths(largeSource).updatedSvg);

		expect(smallGeometry.viewBox).toBe(largeGeometry.viewBox);
		expect(smallGeometry.discDiameter).toBeCloseTo(largeGeometry.discDiameter, 6);
		expect(smallGeometry.cutoutBox.x).toBeCloseTo(largeGeometry.cutoutBox.x, 6);
		expect(smallGeometry.cutoutBox.y).toBeCloseTo(largeGeometry.cutoutBox.y, 6);
		expect(smallGeometry.cutoutBox.width).toBeCloseTo(largeGeometry.cutoutBox.width, 6);
		expect(smallGeometry.cutoutBox.height).toBeCloseTo(largeGeometry.cutoutBox.height, 6);
	});

	it('builds a deterministic label stroke path', () => {
		const path = labelToSvgStrokePath('12', { width: 20, height: 10 });
		expect(path).toContain('M ');
		expect(path).toContain('L ');
	});

	it('builds at least one label shape for STL', () => {
		const shapes = labelToThreeShapes('7', { width: 10, height: 10 });
		expect(shapes.length).toBeGreaterThan(0);
	});

	it('laser export includes disc title when set', () => {
		const { content, layers } = buildExportFixture();
		const combined = combineDoodledial(content, SAMPLE_CONFIG, layers, null, null, {
			discTitle: 'Test Disc',
			discTitleX: 100,
			discTitleY: 30,
			discTitleFontSize: 14
		});
		expect(combined).toContain('Test Disc');
		expect(combined).toContain('disc-title');
	});

	it('laser export keeps text and marks operations', () => {
		const { content, layers } = buildExportFixture();
		const laserSvg = exportLaserSvg(content, SAMPLE_CONFIG, layers);

		expect(laserSvg).toContain('<text');
		expect(laserSvg).toContain('operation-cut');
		expect(laserSvg).toContain('operation-engrave');
	});

	it('preview SVG export returns the combined SVG as-is', () => {
		const combined = combineDoodledial(
			{
				raw: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
				filename: 'test.svg'
			},
			SAMPLE_CONFIG
		);
		const result = exportPreviewSvg(combined);
		expect(result).toBe(combined);
	});

	it('STL export returns ASCII facets and changes with thickness', () => {
		const { content, layers } = buildExportFixture();
		const stlShort = exportStl(content, SAMPLE_CONFIG, layers, {
			discThicknessMm: 2,
			markThicknessMm: 0.5
		});
		const stlTall = exportStl(content, SAMPLE_CONFIG, layers, {
			discThicknessMm: 4,
			markThicknessMm: 1
		});

		expect(stlShort).toContain('solid doodledial');
		expect(stlShort).toContain('facet normal');
		expect(stlShort).toContain('vertex');
		expect(stlShort).not.toBe(stlTall);
	});
});
