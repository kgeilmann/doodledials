import { describe, expect, it } from 'vitest';
import { parseSvgPaths } from './doodledial';
import {
	exportLaserSvg,
	exportStl,
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
	scale: 1
};

describe('export formats', () => {
	it('builds a deterministic label stroke path', () => {
		const path = labelToSvgStrokePath('12', { width: 20, height: 10 });
		expect(path).toContain('M ');
		expect(path).toContain('L ');
	});

	it('builds at least one label shape for STL', () => {
		const shapes = labelToThreeShapes('7', { width: 10, height: 10 });
		expect(shapes.length).toBeGreaterThan(0);
	});

	it('laser export keeps text and marks operations', () => {
		const { content, layers } = buildExportFixture();
		const laserSvg = exportLaserSvg(content, SAMPLE_CONFIG, layers);

		expect(laserSvg).toContain('<text');
		expect(laserSvg).toContain('operation-cut');
		expect(laserSvg).toContain('operation-engrave');
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
