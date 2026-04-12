import { SVG, Svg, G, Path, Text } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DPI, MM_PER_INCH, MM_TO_PX } from './constants';

const DISC_PADDING_PX = 10;
const MARK_LENGTH_PX = 6 * MM_TO_PX;

export function parseSvgPaths(svgContent: string): {
	layers: { id: string; name: string; index: number }[];
	updatedSvg: string;
} {
	const doc = SVG(svgContent) as Svg;
	if ('width' in doc.css()) {
		// @ts-expect-error - css() returns unknown type
		doc.css('width', null);
	}
	if ('height' in doc.css()) {
		// @ts-expect-error - css() returns unknown type
		doc.css('height', null);
	}

	const all = SVG().group().attr('id', 'all');
	doc.children().forEach((c) => {
		c.remove();
		all.add(c);
	});
	doc.add(all);

	const maxImageDimension = Math.max(doc.viewbox().width, doc.viewbox().height);
	const disc = SVG()
		.circle(maxImageDimension * Math.SQRT2)
		.id('disc')
		.center(maxImageDimension / 2, maxImageDimension / 2);
	disc.putIn(doc);

	const layers: { id: string; name: string; index: number }[] = [];

	const paths = doc.find('path');
	paths.forEach((path, index) => {
		// @ts-expect-error - css() returns unknown type
		path.css('stroke', null);
		// @ts-expect-error - css() returns unknown type
		path.css('stroke-width', null);

		const layerId = `layer-${index}`;

		const layer = SVG().group().attr('id', layerId);
		path.remove();
		layer.add(path);
		const pathLabel = createPathLabel(layerId, index + 1, path as Path);
		layer.add(pathLabel);
		all.add(layer);

		layers.push({
			id: layerId,
			name: `Layer ${index + 1}`,
			index: index + 1
		});
	});

	const updatedSvg = doc.svg();

	return { layers, updatedSvg };
}

function createMark(
	layerId: string,
	max: number,
	discSizeToFitEverything: number,
	layerNumber: number
): G {
	const markGroup = SVG().group();

	const centerX = max / 2;
	const markStartY = max / 2 - discSizeToFitEverything / 2;
	const markEndY = markStartY + MARK_LENGTH_PX;
	const mark = markGroup.line(centerX, markStartY, centerX, markEndY);
	mark.addClass('mark-line');
	mark.attr('data-layer-id', layerId);

	const text = markGroup.text(String(layerNumber));
	text.addClass('layer-label');
	text.attr('data-layer-id', layerId);
	text.center(centerX, markEndY + 8);

	return markGroup;
}

function createPathLabel(layerId: string, layerIndex: number, path: Path): Text {
	const pathLabel = SVG().text(String(layerIndex));
	pathLabel.addClass('path-label');
	pathLabel.id('path-label-' + layerId);
	pathLabel.attr('data-layer-id', layerId);
	pathLabel.font({ family: 'monospace', size: 10, anchor: 'start' });
	pathLabel.center(path.bbox().x2 + 4, path.bbox().cy - 5);
	return pathLabel;
}

export function combineDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	highlightedLayerId?: string | null,
	selectedLayerId?: string | null
): string {
	const doc = SVG(content.raw) as Svg;
	const vw = doc.viewbox().width;
	const vh = doc.viewbox().height;
	const max = Math.max(vw, vh);

	const discSizeToFitEverything = max * Math.SQRT2;

	let highlighted: G;
	let selected: G;

	layers?.forEach((layer) => {
		const svgLayer = doc.findOne('#' + layer.id) as G;
		svgLayer.attr('visibility', layer.visible ? 'visible' : 'hidden');
		if (layer.rotation !== 0) {
			const cx = max / 2;
			const cy = max / 2;
			svgLayer.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);
		}
		svgLayer.attr('highlighted', layer.id === highlightedLayerId || layer.id === selectedLayerId);
		const mark = createMark(layer.id, max, discSizeToFitEverything, layer.index);
		svgLayer.add(mark);

		svgLayer.children().forEach((c) => {
			if (c.svg().startsWith('<path')) {
				c.scale(config.scale, max / 2, max / 2).translate(
					config.offsetX * MM_TO_PX,
					config.offsetY * MM_TO_PX
				);

				const offsetXPx = config.offsetX * MM_TO_PX;
				const offsetYPx = config.offsetY * MM_TO_PX;
				const pathLabel = doc.findOne('#path-label-' + layer.id) as Text;
				pathLabel.translate(offsetXPx * config.scale, offsetYPx * config.scale);
				svgLayer.add(pathLabel);
			}
		});

		if (layer.id === highlightedLayerId) highlighted = svgLayer;
		if (layer.id === selectedLayerId) selected = svgLayer;
	});

	const allLayers = doc.findOne('#all');
	if (highlighted!) allLayers?.add(highlighted);
	if (selected!) allLayers?.add(selected);

	doc.viewbox(
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX
	);

	const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
	doc.width(pixelDiameter);
	doc.height(pixelDiameter);
	return doc.svg();
}

export function exportDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[]
): string {
	return combineDoodledial(content, config, layers, null, null);
}
