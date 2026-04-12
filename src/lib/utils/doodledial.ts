import { SVG, Svg, G, Path, Text } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DPI, MM_PER_INCH, MM_TO_PX } from './constants';
import { PotracePlus } from 'potrace-plus';

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

	const style = doc.style();
	style.rule('#disc', {
		fill: 'none',
		stroke: 'black',
		'stroke-width': '2'
	});
	style.rule('.layer-label', {
		'font-family': 'monospace',
		'font-size': 14,
		'text-anchor': 'middle'
	});
	style.rule('.path-label', {});
	style.rule('.mark-line', {
		'stroke-width': 2
	});
	style.rule('.layer', {
		stroke: 'black'
	});

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
		path.css('stroke-width', '1mm');
		path.css('stroke-linejoin', 'round');
		path.css('stroke-linecap', 'round');

		const layerId = `layer-${index}`;

		const layer = SVG().group().attr('id', layerId);
		layer.addClass('layer');
		path.remove();
		layer.add(path);
		const mark = createMark(layerId, maxImageDimension, maxImageDimension * Math.SQRT2, index + 1);
		layer.add(mark);
		const pathLabel = createPathLabel(layerId, index + 1, path as Path);
		layer.add(pathLabel);
		all.add(layer);

		layers.push({
			id: layerId,
			name: `Layer ${index + 1}`,
			index: index + 1
		});
	});

	doc.viewbox(
		-(maxImageDimension * Math.SQRT2 - maxImageDimension) / 2 - DISC_PADDING_PX,
		-(maxImageDimension * Math.SQRT2 - maxImageDimension) / 2 - DISC_PADDING_PX,
		maxImageDimension * Math.SQRT2 + 2 * DISC_PADDING_PX,
		maxImageDimension * Math.SQRT2 + 2 * DISC_PADDING_PX
	);

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
	const cx = doc.viewbox().cx;
	const cy = doc.viewbox().cy;

	let highlighted: G;
	let selected: G;

	layers?.forEach((layer) => {
		const svgLayer = doc.findOne('#' + layer.id) as G;
		svgLayer.attr('visibility', layer.visible ? 'visible' : 'hidden');
		svgLayer.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);
		svgLayer.attr('highlighted', layer.id === highlightedLayerId || layer.id === selectedLayerId);

		svgLayer.children().forEach((c) => {
			if (c.svg().startsWith('<path')) {
				c.scale(config.scale, cx, cy).translate(
					config.offsetX * MM_TO_PX,
					config.offsetY * MM_TO_PX
				);

				const offsetXPx = config.offsetX * MM_TO_PX;
				const offsetYPx = config.offsetY * MM_TO_PX;
				const pathLabel = doc.findOne('#path-label-' + layer.id) as Text;
				const labelOffsetX = (layer.labelOffsetX || 0) * config.scale;
				const labelOffsetY = (layer.labelOffsetY || 0) * config.scale;
				pathLabel.translate(
					offsetXPx * config.scale + labelOffsetX,
					offsetYPx * config.scale + labelOffsetY
				);				
			}
		});

		if (layer.id === highlightedLayerId) highlighted = svgLayer;
		if (layer.id === selectedLayerId) selected = svgLayer;
	});

	const allLayers = doc.findOne('#all');
	if (highlighted!) allLayers?.add(highlighted);
	if (selected!) allLayers?.add(selected);

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

// const OUTPUT_STYLE = {
// 	fill: '#D3D3D3',
// 	stroke: '#FF0000',
// 	strokeWidth: 0.5
// };

export async function traceSVG(svgElement: SVGSVGElement): Promise<string> {
	const traced = await PotracePlus(svgElement);
	return traced.getSVG(true);
}
