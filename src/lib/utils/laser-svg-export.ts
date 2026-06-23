import { SVG, Svg } from '@svgdotjs/svg.js';
import type { CenterStyle, DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from './doodledial';

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
}

export function exportLaserSvg(
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
