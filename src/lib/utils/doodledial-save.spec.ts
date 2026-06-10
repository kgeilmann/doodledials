import { describe, expect, it } from 'vitest';
import { embedMetadata, extractMetadata, type DoodleDialMetadata } from './doodledial-save';

const MINIMAL_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';

const SAMPLE_METADATA: DoodleDialMetadata = {
	version: 1,
	svgContent: { raw: '<svg><path d="M0 0"/></svg>', filename: 'test.svg' },
	config: {
		diameter: 150,
		offsetX: 2,
		offsetY: 3,
		scale: 1,
		sizeToFit: true,
		centerHoleDiameter: 2,
		optimizerGapMm: 2
	},
	layers: [{ id: 'layer-0', name: 'Layer 1', index: 1, visible: true, rotation: 45 }],
	discTitle: 'My Dial',
	discTitleX: 100,
	discTitleY: 20,
	discTitleFontSize: 14
};

describe('doodledial-save', () => {
	it('embeds metadata into SVG', () => {
		const result = embedMetadata(MINIMAL_SVG, SAMPLE_METADATA);
		expect(result).toContain('<metadata>');
		expect(result).toContain('<doodledial version="1">');
		expect(result).toContain('<![CDATA[');
		expect(result).toContain('My Dial');
		expect(result).toContain('layer-0');
		expect(result).toContain('</svg>');
	});

	it('extracts metadata from embedded SVG', () => {
		const embedded = embedMetadata(MINIMAL_SVG, SAMPLE_METADATA);
		const extracted = extractMetadata(embedded);
		expect(extracted).not.toBeNull();
		expect(extracted!.version).toBe(1);
		expect(extracted!.svgContent.filename).toBe('test.svg');
		expect(extracted!.config.diameter).toBe(150);
		expect(extracted!.layers).toHaveLength(1);
		expect(extracted!.layers[0].rotation).toBe(45);
		expect(extracted!.discTitle).toBe('My Dial');
	});

	it('replaces old metadata on re-embed', () => {
		const first = embedMetadata(MINIMAL_SVG, SAMPLE_METADATA);
		const updatedConfig = {
			...SAMPLE_METADATA,
			config: { ...SAMPLE_METADATA.config, diameter: 200 }
		};
		const second = embedMetadata(first, updatedConfig);
		const extracted = extractMetadata(second);
		expect(extracted!.config.diameter).toBe(200);
	});

	it('returns null for SVG without metadata', () => {
		expect(extractMetadata(MINIMAL_SVG)).toBeNull();
	});

	it('returns null for malformed metadata', () => {
		const bad = '<svg><metadata><doodledial>not-json</doodledial></metadata></svg>';
		expect(extractMetadata(bad)).toBeNull();
	});

	it('returns null for wrong version', () => {
		const wrongVersion = MINIMAL_SVG.replace(
			'</svg>',
			'<metadata><doodledial version="999"><![CDATA[{"version":999}]]></doodledial></metadata></svg>'
		);
		expect(extractMetadata(wrongVersion)).toBeNull();
	});

	it('produced SVG renders with valid XML', () => {
		const result = embedMetadata(MINIMAL_SVG, SAMPLE_METADATA);
		expect(result).toMatch(/^<svg/);
		expect(result).toMatch(/<\/svg>$/);
	});
});
