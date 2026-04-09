import { SVG, Svg } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const DPI = 96;
const MM_PER_INCH = 25.4;
const DISC_PADDING_PX = 10;

export function parseSvgPaths(
	svgContent: string
): { svgElementId: string; name: string; updatedSvg: string }[] {
	const doc = SVG(svgContent) as Svg;
	const paths = doc.find('path');
	const layers: { svgElementId: string; name: string; updatedSvg: string }[] = [];

	paths.forEach((path, index) => {
		const existingId = path.attr('id');
		let id: string;
		let name: string;

		if (existingId) {
			id = existingId;
			name = existingId;
		} else {
			id = `path-${index}`;
			name = `Layer ${index + 1}`;
			path.attr('id', id);
		}
		layers.push({
			svgElementId: id,
			name: name,
			updatedSvg: ''
		});
	});

	const updatedSvg = doc.svg();
	layers.forEach((layer, index) => {
		layers[index] = { ...layer, updatedSvg };
	});

	return layers;
}

export function combineDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	highlightedLayerId?: string | null,
	selectedLayerId?: string | null
): string {
	const ct = SVG(content.raw) as Svg;
	const vw = ct.viewbox().width;
	const vh = ct.viewbox().height;
	const max = Math.max(vw, vh);
	
	const discSizeToFitEverything = max * Math.SQRT2;
	const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;

	ct.children().forEach((child) => {
		const childId = child.attr('id');
		if (layers && layers.length > 0) {
			const layer = layers.find((l) => l.svgElementId === childId);
			if (layer) {
				child.attr('visibility', layer.visible ? 'visible' : 'hidden');
			}
		}
		if (childId === highlightedLayerId || childId === selectedLayerId) {
			child.css('stroke', '#6366f1');
			child.css('stroke-width', '5');
		}
	});

	const g = SVG().group();
	const MM_TO_PX = DPI / MM_PER_INCH;
	const MARK_LENGTH_PX = 6 * MM_TO_PX;

	ct.children().forEach((child, index) => {
		const childId = child.attr('id');
		const layerIndex = index + 1;
		const group = SVG().group();

		if (layers && layers.length > 0) {
			const layer = layers.find((l) => l.svgElementId === childId);
			if (layer && layer.rotation !== 0) {
				const cx = max / 2;
				const cy = max / 2;
				group.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);
			}
		}
		if (childId === highlightedLayerId || childId === selectedLayerId) {
			group.css('stroke', '#6366f1');
			group.css('stroke-width', '5');
		}

		const centerX = max / 2;
		const markStartY = max / 2 - discSizeToFitEverything/2 ;
		const markEndY = markStartY + MARK_LENGTH_PX;

		const mark = SVG().line(centerX, markStartY, centerX, markEndY);
		mark.stroke({ color: '#6366f1', width: 2 });
		group.add(mark);

		const text = SVG().text(String(layerIndex));
		text.font({ family: 'monospace', size: 14, anchor: 'middle' });
		text.fill('#6366f1');
		text.center(centerX, markEndY + 8);
		group.add(text);

		child.remove();
		group.add(child);
		g.add(group);
	});
	g.putIn(ct);

	const disc = SVG()
		.id('disc')
		.circle(discSizeToFitEverything)
		.center(max / 2, max / 2)
		.fill('none')
		.stroke({ color: 'black', width: config.borderWidth });
	disc.putIn(ct);

	if ('width' in ct.css()) {
		// @ts-expect-error - css() returns unknown type
		ct.css('width', null);
	}
	if ('height' in ct.css()) {
		// @ts-expect-error - css() returns unknown type
		ct.css('height', null);
	}

	ct.viewbox(
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX
	);
	ct.width(pixelDiameter);
	ct.height(pixelDiameter);
	return ct.svg();
}

export function exportDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[]
): string {
	return combineDoodledial(content, config, layers, null, null);
}
