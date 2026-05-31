import { SVG, Svg } from '@svgdotjs/svg.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from './doodledial';

export interface LaserExportOptions {
	cutClassName?: string;
	engraveClassName?: string;
	cutColor?: string;
	engraveColor?: string;
	cutStrokeWidth?: number;
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

	const combinedSvg = combineDoodledial(content, config, layers, null, null, {
		includePathLabels: true,
		includeHighlighting: false,
		respectLayerVisibility: true,
		applyCutoutTransforms: true,
		applyDiameter: true
	});

	const doc = SVG(combinedSvg) as Svg;

	doc.find('#disc').forEach((disc) => {
		disc.addClass(cutClassName);
		disc.attr('stroke', cutColor);
		disc.attr('fill', 'none');
		disc.attr('stroke-width', String(cutStrokeWidth));
	});

	doc.find('.cutout').forEach((cutout) => {
		cutout.addClass(cutClassName);
		cutout.attr('stroke', cutColor);
		cutout.attr('fill', 'none');
		cutout.attr('stroke-width', String(cutStrokeWidth));
	});

	doc.find('.mark-line').forEach((markLine) => {
		markLine.addClass(engraveClassName);
		markLine.attr('stroke', engraveColor);
		markLine.attr('fill', 'none');
	});

	doc.find('text').forEach((text) => {
		text.addClass(engraveClassName);
		text.attr('fill', engraveColor);
	});

	return doc.svg();
}
