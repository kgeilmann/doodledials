import { SVG, Svg, G, Element } from '@svgdotjs/svg.js';
import type { Layer, DialConfig, SVGContent } from '$lib/types/doodledial';

const RENDER_SIZE = 200;

interface PixelData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export async function detectOverlaps(
	layers: Layer[],
	content: SVGContent,
	config: DialConfig
): Promise<Map<string, Set<string>>> {
	const overlaps = new Map<string, Set<string>>();

	if (layers.length < 2) {
		return overlaps;
	}

	const layerBitmaps = await renderLayersToBitmaps(layers, content, config);

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
	content: SVGContent,
	config: DialConfig
): Promise<Map<string, PixelData>> {
	const bitmaps = new Map<string, PixelData>();

	for (const layer of layers) {
		const tempDoc = SVG(content.raw) as Svg;
		const cx = tempDoc.viewbox().cx;
		const cy = tempDoc.viewbox().cy;
		const svgLayer = tempDoc.findOne('#' + layer.id) as G | null;

		if (!svgLayer) continue;

		const allLayers = tempDoc.findOne('#all');

		svgLayer.attr('visibility', 'visible');
		svgLayer.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);

		const otherLayers = tempDoc.find('.layer');
		otherLayers.forEach((l: Element) => {
			if (l.id() !== layer.id) {
				l.hide();
			}
		});

		tempDoc.find('.mark-line').forEach((m: Element) => m.hide());
		tempDoc.find('.mark').forEach((m: Element) => m.hide());
		tempDoc.find('.path-label').forEach((l: Element) => l.hide());
		tempDoc.find('.layer-label').forEach((l: Element) => l.hide());
		tempDoc.find('#disc').forEach((d: Element) => d.hide());

		const offsetXPx = config.offsetX * ((config.diameter * 300) / 25400);
		const offsetYPx = config.offsetY * ((config.diameter * 300) / 25400);

		tempDoc.find('.cutout').forEach((c: Element) => {
			c.scale(config.scale, cx, cy).translate(offsetXPx, offsetYPx);
		});

		const pixelDiameter = Math.round((config.diameter * 300) / 25400);
		tempDoc.width(pixelDiameter);
		tempDoc.height(pixelDiameter);

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

	ctx.clearRect(0, 0, width, height);

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
