import { SVG, Svg } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const DPI = 96;
const MM_PER_INCH = 25.4;
const DISC_PADDING_PX = 10;

export function parseSvgPaths(
	svgContent: string
): { id: string; name: string; updatedSvg: string }[] {
	const doc = SVG(svgContent) as Svg;
	const all = SVG().group().attr('id', 'all');
	doc.children().forEach((c) => {
		c.remove();
		all.add(c);
	});
	doc.add(all);

	const paths = doc.find('path');
	const layers: { id: string; name: string; updatedSvg: string }[] = [];

	paths.forEach((path, index) => {
		const groupId = `layer-${index}`;

		const group = SVG().group().attr('id', groupId);
		path.remove();
		group.add(path);
		all.add(group);

		layers.push({
			id: groupId,
			name: `Layer ${index + 1}`,
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

	const groups = ct.find('g[id^=layer-]');
	groups.forEach((group) => {
		const groupId = group.attr('id');
		if (layers && layers.length > 0) {
			const layer = layers.find((l) => l.id === groupId);
			if (layer) {
				group.attr('visibility', layer.visible ? 'visible' : 'hidden');
			}
		}
		if (groupId === highlightedLayerId || groupId === selectedLayerId) {
			group.css('stroke', '#6366f1');
		}
	});

	const MM_TO_PX = DPI / MM_PER_INCH;
	const MARK_LENGTH_PX = 6 * MM_TO_PX;

	groups.forEach((group) => {
		const groupId = group.attr('id');
		const layerIndex = parseInt(groupId.replace('layer-', ''), 10) + 1;

		if (layers && layers.length > 0) {
			const layer = layers.find((l) => l.id === groupId);
			if (layer && layer.rotation !== 0) {
				const cx = max / 2;
				const cy = max / 2;
				group.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);
			}
		}

		const centerX = max / 2;
		const markStartY = max / 2 - discSizeToFitEverything / 2;
		const markEndY = markStartY + MARK_LENGTH_PX;

		const mark = SVG().line(centerX, markStartY, centerX, markEndY);
		mark.addClass('mark-line');
		mark.attr('data-layer-id', groupId);
		mark.stroke({
			color: groupId === highlightedLayerId || groupId === selectedLayerId ? '#6366f1' : 'black',
			width: 2
		});
		group.add(mark);

		const text = SVG().text(String(layerIndex));
		text.addClass('layer-label');
		text.attr('data-layer-id', groupId);
		text.font({ family: 'monospace', size: 14, anchor: 'middle' });
		text.fill(groupId === highlightedLayerId || groupId === selectedLayerId ? '#6366f1' : 'black');
		text.center(centerX, markEndY + 8);
		group.add(text);

		group.children().forEach((c) => {
			if (c.svg().startsWith('<path')) {
				c.scale(config.scale, max / 2, max / 2).translate(
					config.offsetX * MM_TO_PX,
					config.offsetY * MM_TO_PX
				);
				if (groupId === highlightedLayerId || groupId === selectedLayerId) {
					c.css('stroke-width', '5');
					c.css('stroke', '#6366f1');
				}
			}
		});
	});

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
