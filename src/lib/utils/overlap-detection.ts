import { SVG, Svg } from '@svgdotjs/svg.js';
import type { Layer } from '$lib/types/doodledial';

const RENDER_SIZE = 200;

interface PixelData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export async function detectOverlaps(
	layers: Layer[],
	combinedSvg: string
): Promise<Map<string, Set<string>>> {
	const overlaps = new Map<string, Set<string>>();

	if (layers.length < 2) {
		return overlaps;
	}

	const layerBitmaps = await renderLayersToBitmaps(layers, combinedSvg);

	for (let i = 0; i < layers.length; i++) {
		for (let j = i + 1; j < layers.length; j++) {
			const bitmapA = layerBitmaps.get(layers[i].id);
			const bitmapB = layerBitmaps.get(layers[j].id);

			if (!bitmapA || !bitmapB) {
				continue;
			}

			if (bitmapsOverlap(bitmapA, bitmapB)) {
				if (!overlaps.has(layers[i].id)) {
					overlaps.set(layers[i].id, new Set());
				}
				if (!overlaps.has(layers[j].id)) {
					overlaps.set(layers[j].id, new Set());
				}
				overlaps.get(layers[i].id)!.add(layers[j].id);
				overlaps.get(layers[j].id)!.add(layers[i].id);
			}
		}
	}

	return overlaps;
}

async function renderLayersToBitmaps(
	layers: Layer[],
	combinedSvg: string
): Promise<Map<string, PixelData>> {
	const bitmaps = new Map<string, PixelData>();

	for (const layer of layers) {
		const tempDoc = SVG(combinedSvg) as Svg;

		tempDoc.find(':not(.cutout)').forEach((e) => {
			e.attr('visibility', 'hidden');
		});

		const l = tempDoc.findOne('#' + layer.id);
		l!.attr('visibility', 'visible');

		const bitmap = await renderSvgToBitmap(tempDoc.svg(), RENDER_SIZE, RENDER_SIZE);
		bitmaps.set(layer.id, bitmap);
	}

	return bitmaps;
}

async function renderSvgToBitmap(
	svgString: string,
	width: number,
	height: number
): Promise<PixelData> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0, width, height);
			resolve({
				data: ctx.getImageData(0, 0, width, height).data,
				width,
				height
			});
		};
		img.onerror = reject;
		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
	});
}

function bitmapsOverlap(a: PixelData, b: PixelData): boolean {
	const { width, height } = a;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const aFilled = a.data[idx + 3] > 0;
			const bFilled = b.data[idx + 3] > 0;

			if (aFilled && bFilled) {
				return true;
			}
		}
	}

	return false;
}

async function renderCutoutWithStroke(
	layer: Layer,
	svgContent: string,
	strokeWidthMm: number,
	renderSize: number,
	dialDiameter: number
): Promise<PixelData> {
	const tempDoc = SVG(svgContent) as Svg;
	tempDoc.find(':not(.cutout)').forEach((e) => e.attr('visibility', 'hidden'));

	const cutout = tempDoc.findOne('#' + layer.id + ' .cutout');
	if (!cutout) throw new Error('No cutout found');

	const strokeWidthPx = (strokeWidthMm / dialDiameter) * renderSize;
	cutout.attr({
		fill: 'none',
		stroke: 'white',
		'stroke-width': strokeWidthPx
	});

	return renderSvgToBitmap(tempDoc.svg(), renderSize, renderSize);
}

export async function detectCutoutGaps(
	layers: Layer[],
	combinedSvg: string,
	gapMm: number = 2,
	dialDiameter: number = 200
): Promise<Map<string, Set<string>>> {
	const gaps = new Map<string, Set<string>>();
	const strokedBitmaps = new Map<string, PixelData>();

	for (const layer of layers) {
		const bitmap = await renderCutoutWithStroke(
			layer,
			combinedSvg,
			gapMm,
			RENDER_SIZE,
			dialDiameter
		);
		strokedBitmaps.set(layer.id, bitmap);
	}

	for (let i = 0; i < layers.length; i++) {
		for (let j = i + 1; j < layers.length; j++) {
			const strokedA = strokedBitmaps.get(layers[i].id)!;
			const strokedB = strokedBitmaps.get(layers[j].id)!;

			if (bitmapsOverlap(strokedA, strokedB)) {
				if (!gaps.has(layers[i].id)) {
					gaps.set(layers[i].id, new Set());
				}
				if (!gaps.has(layers[j].id)) {
					gaps.set(layers[j].id, new Set());
				}
				gaps.get(layers[i].id)!.add(layers[j].id);
				gaps.get(layers[j].id)!.add(layers[i].id);
			}
		}
	}

	return gaps;
}
