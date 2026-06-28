import { SVG, Svg } from '@svgdotjs/svg.js';
import type { CenterStyle, DialConfig, Layer, LayerGroup, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from './doodledial';
import { combineMultiGroupSvg } from './multi-group-svg-export';

export interface LaserExportOptions {
	cutClassName?: string;
	engraveClassName?: string;
	cutColor?: string;
	engraveColor?: string;
	cutStrokeWidth?: number;
	centerStyle?: CenterStyle;
	dialTitle?: string;
	dialTitleX?: number;
	dialTitleY?: number;
	dialTitleFontSize?: number;
	numberingScheme?: 'continuous' | 'independent';
	titleMode?: 'none' | 'name' | 'numbered' | 'both';
	selectedGroupIds?: string[];
}

export function exportLaserSvg(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	if (groups && groups.length > 1) {
		return exportLaserSvgMultiGroup(content, config, layers ?? [], options, groups);
	}
	return exportLaserSvgSingle(content, config, layers, options);
}

function exportLaserSvgMultiGroup(
	content: SVGContent,
	config: DialConfig,
	layers: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	const selectedGroupIds = options?.selectedGroupIds;
	const groupsToExport = selectedGroupIds
		? (groups ?? []).filter((g) => selectedGroupIds.includes(g.id))
		: (groups ?? []);

	const groupsWithLayers = groupsToExport.filter((group) =>
		layers.some((l) => l.groupId === group.id && l.visible)
	);

	if (groupsWithLayers.length === 0) {
		return '';
	}

	const subSvgs = groupsWithLayers.map((group) => {
		let groupLayers = layers.filter((l) => l.groupId === group.id && l.visible);
		if (options?.numberingScheme === 'independent') {
			// Sort by their original index and assign sequential 1-based indices
			groupLayers = groupLayers
				.slice()
				.sort((a, b) => a.index - b.index)
				.map((l, index) => ({
					...l,
					index: index + 1
				}));
		}

		const title = options?.dialTitle || '';
		const groupName = group.name || '';
		const titleMode = options?.titleMode ?? 'none';
		const totalGroups = groupsWithLayers.length;
		const groupIndex = groupsWithLayers.indexOf(group) + 1;

		const finalTitle =
			titleMode === 'name'
				? title
					? `${title} - ${groupName}`
					: groupName
				: titleMode === 'numbered'
					? title
						? `${title} (${groupIndex}/${totalGroups})`
						: `(${groupIndex}/${totalGroups})`
					: titleMode === 'both'
						? title
							? `${title} - ${groupName} (${groupIndex}/${totalGroups})`
							: `${groupName} (${groupIndex}/${totalGroups})`
						: title;

		return exportLaserSvgSingle(content, config, groupLayers, {
			...options,
			dialTitle: finalTitle || undefined
		});
	});

	if (groupsWithLayers.length === 1) {
		return subSvgs[0];
	}

	return combineMultiGroupSvg(subSvgs, 60);
}

function exportLaserSvgSingle(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions
): string {
	const cutClassName = options?.cutClassName ?? 'operation-cut';
	const engraveClassName = options?.engraveClassName ?? 'operation-engrave';
	const cutColor = options?.cutColor ?? '#ff0000';
	const engraveColor = options?.engraveColor ?? 'rgb(0, 0, 0)';
	const cutStrokeWidth = options?.cutStrokeWidth ?? 0.1;
	const centerStyle = options?.centerStyle ?? config.centerStyle;

	const combinedSvg = combineDoodledial(content, config, layers, null, null, {
		includeCutoutLabels: true,
		includeHighlighting: false,
		respectLayerVisibility: true,
		applyCutoutTransforms: true,
		applyDiameter: true,
		centerStyle,
		dialTitle: options?.dialTitle,
		dialTitleX: options?.dialTitleX,
		dialTitleY: options?.dialTitleY,
		dialTitleFontSize: options?.dialTitleFontSize
	});

	const doc = SVG(combinedSvg) as Svg;

	const passedLayerIds = new Set(layers?.map((l) => l.id) ?? []);
	doc.find('.layer').forEach((layerGroup) => {
		if (!passedLayerIds.has(layerGroup.id())) {
			layerGroup.remove();
		}
	});

	doc.find('#dial').forEach((dial) => {
		dial.addClass(cutClassName);
		dial.css('stroke', cutColor);
		dial.css('fill', 'none');
		dial.css('stroke-width', String(cutStrokeWidth));
	});

	doc.find('.cutout').forEach((cutout) => {
		cutout.addClass(cutClassName);
		cutout.css('vector-effect', 'non-scaling-stroke');
		cutout.css('stroke', cutColor);
		cutout.css('fill', 'none');
		cutout.css('stroke-width', String(cutStrokeWidth));
	});

	if (config.centerHoleDiameter > 0) {
		doc.find('#center-hole').forEach((hole) => {
			hole.addClass(cutClassName);
			hole.css('stroke', cutColor);
			hole.css('fill', 'none');
			hole.css('stroke-width', String(cutStrokeWidth));
			hole.css('stroke-dasharray', 'none');
		});
	}

	doc.find('.center-crosshair').forEach((crosshair) => {
		crosshair.addClass(engraveClassName);
		crosshair.css('stroke', engraveColor);
	});

	doc.find('.mark-line').forEach((markLine) => {
		markLine.addClass(engraveClassName);
		markLine.css('stroke', engraveColor);
		markLine.css('fill', 'none');
	});

	doc.find('text').forEach((text) => {
		text.addClass(engraveClassName);
		text.css('fill', engraveColor);
	});

	doc.find('.nine-underscore').forEach((el) => {
		el.addClass(engraveClassName);
		el.css('stroke', engraveColor);
	});

	doc.find('.start-marker').forEach((el) => {
		el.addClass(engraveClassName);
		el.css('fill', engraveColor);
	});

	doc.find('.dial-title').forEach((el) => {
		el.addClass(engraveClassName);
		el.css('fill', engraveColor);
	});

	return doc.svg();
}
