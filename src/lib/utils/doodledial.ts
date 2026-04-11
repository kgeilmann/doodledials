import { SVG, Svg, G , Path} from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DPI, MM_PER_INCH, MM_TO_PX } from './constants';

const DISC_PADDING_PX = 10;
const MARK_LENGTH_PX = 6 * MM_TO_PX;

export function parseSvgPaths(svgContent: string): {
	layers: { id: string; name: string; number: number }[];
	updatedSvg: string;
} {
	const doc = SVG(svgContent) as Svg;
	const all = SVG().group().attr('id', 'all');
	doc.children().forEach((c) => {
		c.remove();
		all.add(c);
	});
	doc.add(all);

	const layers: { id: string; name: string; number: number }[] = [];

	const paths = doc.find('path');
	paths.forEach((path, index) => {
		// @ts-expect-error - css() returns unknown type
		path.css('stroke', null);
		// @ts-expect-error - css() returns unknown type
		path.css('stroke-width', null);

		const groupId = `layer-${index}`;

		const group = SVG().group().attr('id', groupId);
		path.remove();
		group.add(path);
		all.add(group);

		layers.push({
			id: groupId,
			name: `Layer ${index + 1}`,
			number: index + 1
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

function createPathLabel(groupId: string, layerIndex: number, path:Path) {
	const pathLabel = SVG().text(String(layerIndex));
	pathLabel.addClass('path-label');
	pathLabel.attr('data-layer-id', groupId);
	pathLabel.font({ family: 'monospace', size: 10, anchor: 'start' });
	pathLabel.center(path.bbox().x2 + 4, path.bbox().cy -5);
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
				const pathLabel = createPathLabel(layer.id, layer.index, c as Path)
				pathLabel.translate(offsetXPx * config.scale, offsetYPx * config.scale)
				svgLayer.add(pathLabel);
			}
		});
	});

	const disc = SVG()
		.id('disc')
		.circle(discSizeToFitEverything)
		.center(max / 2, max / 2)
		.fill('none')
		.stroke({ color: 'black', width: config.borderWidth });
	disc.putIn(doc);

	doc.viewbox(
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		-(discSizeToFitEverything - max) / 2 - DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX,
		discSizeToFitEverything + 2 * DISC_PADDING_PX
	);

	const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
	doc.css('width', pixelDiameter.toString());
	doc.css('height', pixelDiameter.toString());
	return doc.svg();
}

export function exportDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[]
): string {
	return combineDoodledial(content, config, layers, null, null);
}
