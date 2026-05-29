import { SVG, Svg } from '@svgdotjs/svg.js';
import type { Layer } from '$lib/types/doodledial';

const RENDER_SIZE = 200;

const ANGLE_CACHE_PRECISION = 6;

interface PixelData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export type PairOverlapCacheMode = 'relative';

export interface OverlapDetectionCache {
	bitmapByLayerAngle: Map<string, PixelData>;
	overlapByRelativePairAngles: Map<string, number>;
}

export interface DetectOverlapsOptions {
	cache?: OverlapDetectionCache;
	pairCacheMode?: PairOverlapCacheMode;
}

export interface DetectPairOverlapOptions extends DetectOverlapsOptions {
	firstLayer: Layer;
	secondLayer: Layer;
	combinedSvg: string;
}

export function createOverlapDetectionCache(): OverlapDetectionCache {
	return {
		bitmapByLayerAngle: new Map(),
		overlapByRelativePairAngles: new Map()
	};
}

function roundAngleForCache(angle: number): number {
	return Number(normalizeAngle(angle).toFixed(ANGLE_CACHE_PRECISION));
}

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function toLayerBitmapCacheKey(layerId: string, angle: number): string {
	return `${layerId}:${roundAngleForCache(angle)}`;
}

function toRelativePairCacheKey(
	firstLayerId: string,
	firstAngle: number,
	secondLayerId: string,
	secondAngle: number
): string {
	if (firstLayerId <= secondLayerId) {
		const delta = roundAngleForCache(firstAngle - secondAngle);
		return `${firstLayerId}|${secondLayerId}|${delta}`;
	}

	const delta = roundAngleForCache(secondAngle - firstAngle);
	return `${secondLayerId}|${firstLayerId}|${delta}`;
}

export async function detectOverlaps(
	layers: Layer[],
	combinedSvg: string,
	options?: DetectOverlapsOptions
): Promise<Map<string, Map<string, number>>> {
	const overlaps = new Map<string, Map<string, number>>();

	if (layers.length < 2) {
		return overlaps;
	}

	const layerBitmaps = await renderLayersToBitmaps(layers, combinedSvg, options?.cache);

	for (let i = 0; i < layers.length; i++) {
		for (let j = i + 1; j < layers.length; j++) {
			const layerA = layers[i];
			const layerB = layers[j];
			const bitmapA = layerBitmaps.get(layerA.id);
			const bitmapB = layerBitmaps.get(layerB.id);

			if (!bitmapA || !bitmapB) {
				continue;
			}

			const relativeKey = toRelativePairCacheKey(
				layerA.id,
				layerA.rotation,
				layerB.id,
				layerB.rotation
			);

			let pixelCount: number | undefined;
			if (options?.cache) {
				pixelCount = options.cache.overlapByRelativePairAngles.get(relativeKey);
			}

			if (pixelCount === undefined) {
				pixelCount = countOverlapPixels(bitmapA, bitmapB);
				if (options?.cache) {
					options.cache.overlapByRelativePairAngles.set(relativeKey, pixelCount);
				}
			}

			if (pixelCount > 0) {
				if (!overlaps.has(layerA.id)) {
					overlaps.set(layerA.id, new Map());
				}
				if (!overlaps.has(layerB.id)) {
					overlaps.set(layerB.id, new Map());
				}
				overlaps.get(layerA.id)!.set(layerB.id, pixelCount);
				overlaps.get(layerB.id)!.set(layerA.id, pixelCount);
			}
		}
	}

	return overlaps;
}

export async function detectPairOverlapPixels(options: DetectPairOverlapOptions): Promise<number> {
	const firstLayer = options.firstLayer;
	const secondLayer = options.secondLayer;

	const relativeKey = toRelativePairCacheKey(
		firstLayer.id,
		firstLayer.rotation,
		secondLayer.id,
		secondLayer.rotation
	);

	let pixelCount: number | undefined;
	if (options.cache) {
		pixelCount = options.cache.overlapByRelativePairAngles.get(relativeKey);
	}

	if (pixelCount !== undefined) {
		return pixelCount;
	}

	const layerBitmaps = await renderLayersToBitmaps(
		[firstLayer, secondLayer],
		options.combinedSvg,
		options.cache
	);
	const firstBitmap = layerBitmaps.get(firstLayer.id);
	const secondBitmap = layerBitmaps.get(secondLayer.id);
	if (!firstBitmap || !secondBitmap) {
		return 0;
	}

	pixelCount = countOverlapPixels(firstBitmap, secondBitmap);
	if (options.cache) {
		options.cache.overlapByRelativePairAngles.set(relativeKey, pixelCount);
	}

	return pixelCount;
}

async function renderLayersToBitmaps(
	layers: Layer[],
	combinedSvg: string,
	cache?: OverlapDetectionCache
): Promise<Map<string, PixelData>> {
	const bitmaps = new Map<string, PixelData>();
	const parsedSvgRoot = parseSvgRoot(combinedSvg);
	const serializer = new XMLSerializer();

	for (const layer of layers) {
		const cacheKey = toLayerBitmapCacheKey(layer.id, layer.rotation);
		const cachedBitmap = cache?.bitmapByLayerAngle.get(cacheKey);
		if (cachedBitmap) {
			bitmaps.set(layer.id, cachedBitmap);
			continue;
		}

		const cutoutOnlySvg = buildCutoutOnlyLayerSvg(parsedSvgRoot, layer.id, serializer);
		if (!cutoutOnlySvg) {
			continue;
		}

		const bitmap = await renderSvgToBitmap(cutoutOnlySvg, RENDER_SIZE, RENDER_SIZE);
		bitmaps.set(layer.id, bitmap);
		cache?.bitmapByLayerAngle.set(cacheKey, bitmap);
	}

	return bitmaps;
}

function parseSvgRoot(svgString: string): SVGSVGElement {
	const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
	return doc.documentElement as unknown as SVGSVGElement;
}

function copySvgRootAttributes(source: SVGSVGElement, target: SVGSVGElement): void {
	for (const attr of Array.from(source.attributes)) {
		target.setAttribute(attr.name, attr.value);
	}
}

function cloneSharedSvgChildren(sourceRoot: SVGSVGElement, targetRoot: SVGSVGElement): void {
	for (const child of Array.from(sourceRoot.children)) {
		const tagName = child.tagName.toLowerCase();
		if (tagName === 'defs' || tagName === 'style') {
			targetRoot.appendChild(child.cloneNode(true));
		}
	}
}

function escapeAttributeValue(value: string): string {
	return value.replace(/"/g, '\\"');
}

function pruneToCutoutSubtree(element: Element): boolean {
	let keepElement = element.classList.contains('cutout');

	for (const child of Array.from(element.children)) {
		const shouldKeepChild = pruneToCutoutSubtree(child);
		if (!shouldKeepChild) {
			child.remove();
			continue;
		}

		keepElement = true;
	}

	return keepElement;
}

function buildCutoutOnlyLayerSvg(
	sourceRoot: SVGSVGElement,
	layerId: string,
	serializer: XMLSerializer
): string | null {
	const layerSelector = `[id="${escapeAttributeValue(layerId)}"]`;
	const sourceLayer = sourceRoot.querySelector(layerSelector);
	if (!sourceLayer) {
		return null;
	}

	const svgNamespace = sourceRoot.namespaceURI ?? 'http://www.w3.org/2000/svg';
	const isolatedDoc = document.implementation.createDocument(svgNamespace, 'svg', null);
	const isolatedRoot = isolatedDoc.documentElement as unknown as SVGSVGElement;

	copySvgRootAttributes(sourceRoot, isolatedRoot);
	cloneSharedSvgChildren(sourceRoot, isolatedRoot);

	const layerClone = sourceLayer.cloneNode(true) as Element;
	if (!pruneToCutoutSubtree(layerClone)) {
		return null;
	}

	isolatedRoot.appendChild(layerClone);
	return serializer.serializeToString(isolatedRoot);
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

function countOverlapPixels(a: PixelData, b: PixelData): number {
	const { width, height } = a;
	let count = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const aFilled = a.data[idx + 3] > 0;
			const bFilled = b.data[idx + 3] > 0;

			if (aFilled && bFilled) {
				count++;
			}
		}
	}

	return count;
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
