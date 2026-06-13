export interface DoodleDialMetadata {
	version: 1;
	svgContent: { raw: string; filename: string; originalRaw?: string };
	config: {
		diameter: number;
		offsetX: number;
		offsetY: number;
		scale: number;
		sizeToFit: boolean;
		centerHoleDiameter: number;
		optimizerGapMm: number;
		pathLabelFontSize: number;
		titleFontFamily: string;
	};
	layers: Array<{
		id: string;
		name: string;
		index: number;
		visible: boolean;
		rotation: number;
		labelOffsetX?: number;
		labelOffsetY?: number;
		labelPlacementMode?: 'auto' | 'manual';
		labelPlacementStatus?: { status: 'placed' } | { status: 'error'; reason: string };
	}>;
	discTitle: string;
	discTitleX: number;
	discTitleY: number;
	discTitleFontSize: number;
}

const CURRENT_VERSION = 1;

export function embedMetadata(svg: string, metadata: DoodleDialMetadata): string {
	const json = JSON.stringify(metadata);
	const metadataBlock = `<metadata><doodledial version="${CURRENT_VERSION}"><![CDATA[${json}]]></doodledial></metadata>`;
	const cleaned = svg.replace(/<metadata>[\s\S]*?<\/metadata>/, '');
	return cleaned.replace('</svg>', `${metadataBlock}</svg>`);
}

export function extractMetadata(svg: string): DoodleDialMetadata | null {
	try {
		const match = svg.match(/<doodledial\b[^>]*>([\s\S]*?)<\/doodledial>/);
		if (!match) return null;
		const raw = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
		const data = JSON.parse(raw);
		return data?.version === CURRENT_VERSION ? (data as DoodleDialMetadata) : null;
	} catch {
		return null;
	}
}
