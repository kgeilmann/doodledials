import { SVG, Svg, G } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const DPI = 96;
const MM_PER_INCH = 25.4;
const MM_TO_PX = DPI / MM_PER_INCH;

const DISC_PADDING_PX = 10;
const MARK_LENGTH_PX = 6 * MM_TO_PX;

function boxesOverlap(
	a: { x: number; y: number; width: number; height: number },
	b: { x: number; y: number; width: number; height: number }
): boolean {
	return !(
		a.x + a.width <= b.x ||
		b.x + b.width <= a.x ||
		a.y + a.height <= b.y ||
		b.y + b.height <= a.y
	);
}

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

	const paths = doc.find('path');
	const layers: { id: string; name: string; number: number }[] = [];

	paths.forEach((path, index) => {
		// @ts-expect-error - css() returns unknown type
		path.css('stroke', null);
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
	groupId: number,
	max: number,
	discSizeToFitEverything: number,
	layerIndex: number
): G {
	const markGroup = SVG().group();

	const centerX = max / 2;
	const markStartY = max / 2 - discSizeToFitEverything / 2;
	const markEndY = markStartY + MARK_LENGTH_PX;
	const mark = markGroup.line(centerX, markStartY, centerX, markEndY);
	mark.addClass('mark-line');
	mark.attr('data-layer-id', groupId);

	const text = markGroup.text(String(layerIndex));
	text.addClass('layer-label');
	text.attr('data-layer-id', groupId);
	text.center(centerX, markEndY + 8);

	return markGroup;
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
		group.attr('highlighted', groupId === highlightedLayerId || groupId === selectedLayerId);
	});

	const pathLabels: ReturnType<typeof SVG.prototype.text>[] = [];

	groups.forEach((group) => {
		const groupId = group.attr('id');
		let layerIndex: number = 0;

		if (layers && layers.length > 0) {
			const layer = layers.find((l) => l.id === groupId);
			if (layer) layerIndex = layer.index;
			if (layer && layer.rotation !== 0) {
				const cx = max / 2;
				const cy = max / 2;
				group.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);
			}
		}

		const mark = createMark(groupId, max, discSizeToFitEverything, layerIndex);
		group.add(mark);

		group.children().forEach((c) => {
			if (c.svg().startsWith('<path')) {
				c.scale(config.scale, max / 2, max / 2).translate(
					config.offsetX * MM_TO_PX,
					config.offsetY * MM_TO_PX
				);

				const pathBbox = c.bbox();
				const offsetXPx = config.offsetX * MM_TO_PX;
				const offsetYPx = config.offsetY * MM_TO_PX;
				const pathLabel = SVG().text(String(layerIndex));
				pathLabel.addClass('path-label');
				pathLabel.attr('data-layer-id', groupId);
				pathLabel.font({ family: 'monospace', size: 10, anchor: 'start' });
				pathLabel.move(
					pathBbox.x2 + 4 + offsetXPx * config.scale,
					pathBbox.cy + offsetYPx * config.scale - 5
				);
				group.add(pathLabel);
				pathLabels.push(pathLabel);
			}
		});
	});

	for (let i = 0; i < pathLabels.length; i++) {
		for (let j = i + 1; j < pathLabels.length; j++) {
			const box1 = pathLabels[i].bbox();
			const box2 = pathLabels[j].bbox();
			if (boxesOverlap(box1, box2)) {
				pathLabels[i].fill('#ef4444');
				pathLabels[j].fill('#ef4444');
			}
		}
	}

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
