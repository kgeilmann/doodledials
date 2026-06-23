import { SVG, type Svg } from '@svgdotjs/svg.js';
import { describe, expect, it } from 'vitest';
import { combineDoodledial, parseSvgPaths } from './doodledial';
import { combineMultiGroupSvg } from './multi-group-svg-export';
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
			rotation: 0,
			groupId: ''
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
	sizeToFit: true,
	centerHoleDiameter: 0.5,
	centerStyle: 'hole',
	cutoutLabelFontSize: 10,
	titleFontFamily: 'sans-serif'
};

function getParsedGeometry(svg: string): {
	viewBox: string;
	dialDiameter: number;
	cutoutBox: { x: number; y: number; width: number; height: number };
} {
	const doc = SVG(svg) as Svg;
	const dial = doc.findOne('#dial');
	const cutout = doc.findOne('.cutout');
	if (!dial || !cutout) {
		throw new Error('Expected parsed SVG to contain dial and cutout');
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
		dialDiameter: Number(dial.attr('r')) * 2,
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
		expect(smallGeometry.dialDiameter).toBeCloseTo(largeGeometry.dialDiameter, 6);
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

	it('laser export includes dial title when set', () => {
		const { content, layers } = buildExportFixture();
		const combined = combineDoodledial(content, SAMPLE_CONFIG, layers, null, null, {
			dialTitle: 'Test Dial',
			dialTitleX: 100,
			dialTitleY: 30,
			dialTitleFontSize: 14
		});
		expect(combined).toContain('Test Dial');
		expect(combined).toContain('dial-title');
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

	it('preview export produces multiple sub-dials when groups > 1', () => {
		const { content } = buildExportFixture();
		const layers = [
			{ id: 'layer-1', name: 'Layer 1', index: 1, visible: true, rotation: 0, groupId: 'g1' },
			{ id: 'layer-2', name: 'Layer 2', index: 2, visible: true, rotation: 0, groupId: 'g2' }
		];
		const groups = [
			{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
			{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
		];
		const result = exportPreviewSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>', {
			groups,
			content,
			config: SAMPLE_CONFIG,
			layers
		});

		// Should contain two translate groups for two sub-dials
		const translateMatches = result.match(/transform="translate\(/g);
		expect(translateMatches).toHaveLength(2);

		// Each sub-dial needs a dial circle
		expect(result.match(/id="dial"/g)).toHaveLength(2);
	});

	it('preview export single group returns combined SVG as-is', () => {
		const combined = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
		const result = exportPreviewSvg(combined);
		expect(result).toBe(combined);
	});

	it('STL export returns ASCII facets and changes with thickness', () => {
		const { content, layers } = buildExportFixture();
		const stlShort = exportStl(content, SAMPLE_CONFIG, layers, {
			dialThicknessMm: 2,
			markThicknessMm: 0.5
		});
		const stlTall = exportStl(content, SAMPLE_CONFIG, layers, {
			dialThicknessMm: 4,
			markThicknessMm: 1
		});

		expect(stlShort).toContain('solid doodledial');
		expect(stlShort).toContain('facet normal');
		expect(stlShort).toContain('vertex');
		expect(stlShort).not.toBe(stlTall);
	});
});

describe('laser export multi-group', () => {
	it('produces multiple sub-dials when groups > 1', () => {
		const { content, layers: fixtureLayers } = buildExportFixture();
		const layers = fixtureLayers.map((l, i) => ({
			...l,
			groupId: i < Math.ceil(fixtureLayers.length / 2) ? 'g1' : 'g2'
		}));
		const groups = [
			{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
			{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
		];
		const result = exportLaserSvg(content, SAMPLE_CONFIG, layers, undefined, groups);

		const translateMatches = result.match(/transform="translate\(/g);
		expect(translateMatches).toHaveLength(2);

		expect(result.match(/id="dial"/g)).toHaveLength(2);

		expect(result.match(/id="center-hole"/g)).toHaveLength(2);
	});

	it('single group behaves the same as before', () => {
		const { content, layers } = buildExportFixture();
		const resultWithoutGroups = exportLaserSvg(content, SAMPLE_CONFIG, layers);
		const resultWithSingleGroup = exportLaserSvg(content, SAMPLE_CONFIG, layers, undefined, []);

		expect(resultWithSingleGroup).toBe(resultWithoutGroups);
	});
});

describe('combineMultiGroupSvg', () => {
	it('arranges sub-SVGs in a grid', () => {
		const subSvgs = [
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle r="10"/></svg>',
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect w="10" h="10"/></svg>',
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M0 0"/></svg>',
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><line x1="0" y1="0" x2="10" y2="10"/></svg>'
		];
		const result = combineMultiGroupSvg(subSvgs, 60);

		expect(result).toContain('<svg');
		expect(result).toContain('</svg>');

		expect(result).toContain('translate(0, 0)');
		expect(result).toContain('translate(160, 0)');
		expect(result).toContain('translate(0, 160)');
		expect(result).toContain('translate(160, 160)');

		expect(result).toContain('viewBox="0 0 320 320"');
	});

	it('handles single SVG', () => {
		const result = combineMultiGroupSvg(
			['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle r="10"/></svg>'],
			60
		);
		expect(result).toContain('translate(0, 0)');
		expect(result).not.toContain('translate(160');
	});

	it('returns empty string for empty input', () => {
		expect(combineMultiGroupSvg([], 60)).toBe('');
	});

	it('preserves namespace declarations from source SVGs', () => {
		const subSvgs = [
			'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 100 100"><g inkscape:label="test"/></svg>'
		];
		const result = combineMultiGroupSvg(subSvgs, 60);
		expect(result).toContain('xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"');
	});
});
