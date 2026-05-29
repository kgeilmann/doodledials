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

	const style = doc.style();
	style.rule('#disc', {
		fill: 'none',
		stroke: 'black',
		'stroke-width': '2'
	});

	style.rule('.mark-line', {
		'stroke-width': 2
	});

	style.rule('.layer', {
		stroke: 'black',
		'stroke-width': '0.1',
		fill: 'black',
		'fill-opacity': 1
	});

	style.rule('.layer .cutout', {
		stroke: 'red',
		'stroke-width': '0.1',
		fill: 'gray',
		'fill-opacity': 0.2
	});

	const all = SVG().group().attr('id', 'all');

	doc.children().forEach((c) => {
		c.remove();
		all.add(c);
	});
	doc.add(all);

	const maxImageDimension = Math.max(doc.viewbox().width, doc.viewbox().height);
	doc
		.circle(maxImageDimension * Math.SQRT2)
		.center(maxImageDimension / 2, maxImageDimension / 2)
		.id('disc');

	const layers: { id: string; name: string; index: number }[] = [];

	const paths = doc.find('path');
	paths.forEach((path, index) => {
		path.addClass('cutout');

		// @ts-expect-error - css() returns unknown type
		path.css('stroke', null);
		// @ts-expect-error - css() returns unknown type
		path.css('stroke-width', null);
		// @ts-expect-error - css() returns unknown type
		path.css('fill', null);
		// @ts-expect-error - css() returns unknown type
		path.css('fill-opacity', null);

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
	text.font({ family: 'monospace', size: 10, anchor: 'middle' });
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

export interface CombineDoodledialOptions {
	includePathLabels?: boolean;
	includeHighlighting?: boolean;
	respectLayerVisibility?: boolean;
	applyCutoutTransforms?: boolean;
	applyDiameter?: boolean;
}

export interface OptimizerSvgTemplate {
	rawTemplate: string;
	layerIds: string[];
}

const OPTIMIZER_ROTATION_TOKEN_PREFIX = '__DDL_ROT_';
const OPTIMIZER_ROTATION_TOKEN_REGEX = /__DDL_ROT_([A-Za-z0-9_-]+)__/g;

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function toOptimizerRotationToken(layerId: string): string {
	return `${OPTIMIZER_ROTATION_TOKEN_PREFIX}${layerId}__`;
}

export function createOptimizerSvgTemplate(
	content: SVGContent,
	config: DialConfig,
	layerIds: string[]
): OptimizerSvgTemplate {
	const doc = SVG(content.raw) as Svg;
	const cx = doc.viewbox().cx;
	const cy = doc.viewbox().cy;
	const offsetXPx = config.offsetX * MM_TO_PX;
	const offsetYPx = config.offsetY * MM_TO_PX;

	doc.find('.cutout').forEach((cutout) => {
		cutout.scale(config.scale, cx, cy).translate(offsetXPx, offsetYPx);
	});

	doc.find('.path-label').forEach((label) => {
		label.remove();
	});

	for (const layerId of layerIds) {
		const svgLayer = doc.findOne('#' + layerId) as G | null;
		if (!svgLayer) {
			continue;
		}

		svgLayer.attr('visibility', 'visible');
		svgLayer.attr('highlighted', null);
		svgLayer.attr('transform', `rotate(${toOptimizerRotationToken(layerId)}, ${cx}, ${cy})`);
	}

	const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
	doc.width(pixelDiameter);
	doc.height(pixelDiameter);

	return {
		rawTemplate: doc.svg(),
		layerIds
	};
}

export function combineOptimizerSvgTemplate(
	template: OptimizerSvgTemplate,
	rotationsByLayerId: Record<string, number>
): string {
	void template.layerIds;
	return template.rawTemplate.replace(OPTIMIZER_ROTATION_TOKEN_REGEX, (_match, layerId) => {
		const angle = rotationsByLayerId[layerId] ?? 0;
		return String(normalizeAngle(angle));
	});
}

export function precomputeOptimizerSvgContent(content: SVGContent, config: DialConfig): SVGContent {
	const doc = SVG(content.raw) as Svg;
	const cx = doc.viewbox().cx;
	const cy = doc.viewbox().cy;
	const offsetXPx = config.offsetX * MM_TO_PX;
	const offsetYPx = config.offsetY * MM_TO_PX;

	doc.find('.cutout').forEach((cutout) => {
		cutout.scale(config.scale, cx, cy).translate(offsetXPx, offsetYPx);
	});

	doc.find('.path-label').forEach((label) => {
		label.remove();
	});

	const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
	doc.width(pixelDiameter);
	doc.height(pixelDiameter);

	return {
		...content,
		raw: doc.svg()
	};
}

export function combineDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	highlightedLayerId?: string | null,
	selectedLayerId?: string | null,
	options?: CombineDoodledialOptions
): string {
	const doc = SVG(content.raw) as Svg;
	const cx = doc.viewbox().cx;
	const cy = doc.viewbox().cy;
	const includePathLabels = options?.includePathLabels ?? true;
	const includeHighlighting = options?.includeHighlighting ?? true;
	const respectLayerVisibility = options?.respectLayerVisibility ?? true;
	const applyCutoutTransforms = options?.applyCutoutTransforms ?? true;
	const applyDiameter = options?.applyDiameter ?? true;

	let highlighted: G;
	let selected: G;

	const offsetXPx = config.offsetX * MM_TO_PX;
	const offsetYPx = config.offsetY * MM_TO_PX;

	layers?.forEach((layer) => {
		const svgLayer = doc.findOne('#' + layer.id) as G;
		svgLayer.attr('visibility', respectLayerVisibility && !layer.visible ? 'hidden' : 'visible');
		svgLayer.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);

		if (includeHighlighting) {
			svgLayer.attr('highlighted', layer.id === highlightedLayerId || layer.id === selectedLayerId);
		}

		if (includeHighlighting) {
			if (layer.id === highlightedLayerId) highlighted = svgLayer;
			if (layer.id === selectedLayerId) selected = svgLayer;
		}

		if (applyCutoutTransforms) {
			svgLayer.find('.cutout').forEach((c) => {
				c.scale(config.scale, cx, cy).translate(offsetXPx, offsetYPx);
			});
		}

		if (includePathLabels && applyCutoutTransforms) {
			svgLayer.find('#path-label-' + layer.id).forEach((label) => {
				const pathLabel = label as Text;
				const labelOffsetX = (layer.labelOffsetX || 0) * config.scale;
				const labelOffsetY = (layer.labelOffsetY || 0) * config.scale;
				pathLabel.translate(
					offsetXPx * config.scale + labelOffsetX,
					offsetYPx * config.scale + labelOffsetY
				);
			});
		}
	});

	if (includeHighlighting) {
		const allLayers = doc.findOne('#all');
		if (highlighted!) allLayers?.add(highlighted);
		if (selected!) allLayers?.add(selected);
	}

	if (applyDiameter) {
		const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
		doc.width(pixelDiameter);
		doc.height(pixelDiameter);
	}

	return doc.svg();
}

export function exportDoodledial(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[]
): string {
	return combineDoodledial(content, config, layers, null, null);
}
