import { combineDoodledial } from './doodledial';
import { combineMultiGroupSvg } from './multi-group-svg-export';
import type { DialConfig, Layer, LayerGroup, SVGContent } from '$lib/types/doodledial';
import type { CenterStyle } from '$lib/types/doodledial';

export interface PreviewExportOptions {
	groups?: LayerGroup[];
	content?: SVGContent;
	config?: DialConfig;
	layers?: Layer[];
	centerStyle?: CenterStyle;
}

export function exportPreviewSvg(combinedSvg: string, options?: PreviewExportOptions): string {
	if (
		options?.groups &&
		options.groups.length > 1 &&
		options.content &&
		options.config &&
		options.layers
	) {
		const { content, config, layers, centerStyle } = options;
		const groupsWithLayers = options.groups.filter((group) =>
			layers.some((l) => l.groupId === group.id && l.visible)
		);
		if (groupsWithLayers.length <= 1) {
			return combinedSvg;
		}
		const subSvgs = groupsWithLayers.map((group) => {
			const groupLayers = layers.filter((l) => l.groupId === group.id && l.visible);
			return combineDoodledial(content, config, groupLayers, null, null, {
				includeCutoutLabels: true,
				includeHighlighting: false,
				respectLayerVisibility: true,
				applyDiameter: true,
				centerStyle: centerStyle ?? 'crosshair'
			});
		});
		return combineMultiGroupSvg(subSvgs, 60);
	}
	return combinedSvg;
}
