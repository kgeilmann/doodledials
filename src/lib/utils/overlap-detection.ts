import { SVG, Svg } from '@svgdotjs/svg.js';
import type { Layer } from '$lib/types/doodledial';
import { normalizeAngle } from './rotation';

const RENDER_SIZE = 200;

const ANGLE_CACHE_PRECISION = 6;

interface PixelData {
	alpha: Uint8ClampedArray;
	width: number;
	height: number;
}

export type PairOverlapComputationMode = 'count' | 'any';

/**
 * A cache entry for a pair overlap result.
 * `exact: true`  → `value` is the precise pixel count.
 * `exact: false` → `value` is a lower bound (1 = at least one overlap pixel exists).
 */
export interface OverlapCacheEntry {
	value: number;
	exact: boolean;
}

export interface OverlapDetectionCache {
	bitmapByLayerAngle: Map<string, PixelData>;
	overlapByRelativePairAngles: Map<string, OverlapCacheEntry>;
}

export interface DetectOverlapsOptions {
	cache?: OverlapDetectionCache;
	cutoutStrokeWidthMm?: number;
	dialDiameterMm?: number;
}

export interface DetectPairOverlapOptions extends DetectOverlapsOptions {
	firstLayer: Layer;
	secondLayer: Layer;
	combinedSvg: string;
	overlapMode?: PairOverlapComputationMode;
}

export interface DetectCutoutLabelOverlapPixelsInput {
	combinedSvg: string;
	labelCorners: Array<{ x: number; y: number }>;
	visibleLayerIds: string[];
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

function toLayerBitmapCacheKey(
	layerId: string,
	angle: number,
	cutoutStrokeWidthMm?: number,
	dialDiameterMm?: number
): string {
	const base = `${layerId}:${roundAngleForCache(angle)}`;
	if (
		typeof cutoutStrokeWidthMm !== 'number' ||
		typeof dialDiameterMm !== 'number' ||
		!Number.isFinite(cutoutStrokeWidthMm) ||
		!Number.isFinite(dialDiameterMm)
	) {
		return base;
	}

	return `${base}:stroke=${cutoutStrokeWidthMm.toFixed(6)}:diameter=${dialDiameterMm.toFixed(6)}`;
}

function toRelativePairCacheKey(
	firstLayerId: string,
	firstAngle: number,
	secondLayerId: string,
	secondAngle: number,
	cutoutStrokeWidthMm?: number,
	dialDiameterMm?: number
): string {
	const strokeSuffix =
		typeof cutoutStrokeWidthMm === 'number' &&
		typeof dialDiameterMm === 'number' &&
		Number.isFinite(cutoutStrokeWidthMm) &&
		Number.isFinite(dialDiameterMm)
			? `|stroke=${cutoutStrokeWidthMm.toFixed(6)}|diameter=${dialDiameterMm.toFixed(6)}`
			: '';

	if (firstLayerId <= secondLayerId) {
		const delta = roundAngleForCache(firstAngle - secondAngle);
		return `${firstLayerId}|${secondLayerId}|${delta}${strokeSuffix}`;
	}

	const delta = roundAngleForCache(secondAngle - firstAngle);
	return `${secondLayerId}|${firstLayerId}|${delta}${strokeSuffix}`;
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

	const layerBitmaps = await renderLayersToBitmaps(
		layers,
		combinedSvg,
		options?.cache,
		options?.cutoutStrokeWidthMm,
		options?.dialDiameterMm
	);

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
				layerB.rotation,
				options?.cutoutStrokeWidthMm,
				options?.dialDiameterMm
			);

			let pixelCount: number | undefined;
			if (options?.cache) {
				const entry = options.cache.overlapByRelativePairAngles.get(relativeKey);
				if (entry?.exact) {
					pixelCount = entry.value;
				}
			}

			if (pixelCount === undefined) {
				pixelCount = countOverlapPixels(bitmapA, bitmapB);
				if (options?.cache) {
					options.cache.overlapByRelativePairAngles.set(relativeKey, {
						value: pixelCount,
						exact: true
					});
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
	const overlapMode = options.overlapMode ?? 'count';

	const relativeKey = toRelativePairCacheKey(
		firstLayer.id,
		firstLayer.rotation,
		secondLayer.id,
		secondLayer.rotation,
		options.cutoutStrokeWidthMm,
		options.dialDiameterMm
	);

	const cacheEntry = options.cache?.overlapByRelativePairAngles.get(relativeKey);

	if (cacheEntry !== undefined) {
		if (cacheEntry.exact) {
			// Exact count satisfies both modes.
			return overlapMode === 'any' ? (cacheEntry.value > 0 ? 1 : 0) : cacheEntry.value;
		}
		// Lower-bound entry (value = 1, meaning "at least one overlap").
		if (overlapMode === 'any') {
			return 1;
		}
		// count mode with a lower-bound entry: fall through to lazy exact-count promotion.
	}

	const layerBitmaps = await renderLayersToBitmaps(
		[firstLayer, secondLayer],
		options.combinedSvg,
		options.cache,
		options.cutoutStrokeWidthMm,
		options.dialDiameterMm
	);
	const firstBitmap = layerBitmaps.get(firstLayer.id);
	const secondBitmap = layerBitmaps.get(secondLayer.id);
	if (!firstBitmap || !secondBitmap) {
		return 0;
	}

	if (overlapMode === 'any') {
		// Cache miss: run fast boolean check.
		// Store exact 0 when no overlap (saves a future count-mode compute too).
		// Store lower-bound 1 when overlap exists, leaving exact count for later.
		const hasOverlap = bitmapsOverlap(firstBitmap, secondBitmap);
		if (options.cache) {
			options.cache.overlapByRelativePairAngles.set(relativeKey, {
				value: hasOverlap ? 1 : 0,
				exact: !hasOverlap
			});
		}
		return hasOverlap ? 1 : 0;
	}

	// count mode: compute exact, overwriting any existing lower-bound entry.
	const exactCount = countOverlapPixels(firstBitmap, secondBitmap);
	if (options.cache) {
		options.cache.overlapByRelativePairAngles.set(relativeKey, { value: exactCount, exact: true });
	}
	return exactCount;
}

export async function detectCutoutLabelOverlapPixels(
	input: DetectCutoutLabelOverlapPixelsInput
): Promise<number> {
	if (input.visibleLayerIds.length === 0 || input.labelCorners.length < 3) {
		return 0;
	}

	const parsedSvgRoot = parseSvgRoot(input.combinedSvg);
	const serializer = new XMLSerializer();
	const cutoutMaskSvg = buildCutoutOnlyVisibleLayersSvg(
		parsedSvgRoot,
		input.visibleLayerIds,
		serializer
	);
	if (!cutoutMaskSvg) {
		return 0;
	}

	const labelMaskSvg = buildLabelPolygonMaskSvg(parsedSvgRoot, input.labelCorners, serializer);
	if (!labelMaskSvg) {
		return 0;
	}

	const cutoutMaskBitmap = await renderSvgToBitmap(cutoutMaskSvg, RENDER_SIZE, RENDER_SIZE);
	const labelMaskBitmap = await renderSvgToBitmap(labelMaskSvg, RENDER_SIZE, RENDER_SIZE);

	return countOverlapPixels(cutoutMaskBitmap, labelMaskBitmap);
}

async function renderLayersToBitmaps(
	layers: Layer[],
	combinedSvg: string,
	cache?: OverlapDetectionCache,
	cutoutStrokeWidthMm?: number,
	dialDiameterMm?: number
): Promise<Map<string, PixelData>> {
	const bitmaps = new Map<string, PixelData>();
	const missingLayers: Layer[] = [];

	for (const layer of layers) {
		const cacheKey = toLayerBitmapCacheKey(
			layer.id,
			layer.rotation,
			cutoutStrokeWidthMm,
			dialDiameterMm
		);
		const cachedBitmap = cache?.bitmapByLayerAngle.get(cacheKey);
		if (cachedBitmap) {
			bitmaps.set(layer.id, cachedBitmap);
		} else {
			missingLayers.push(layer);
		}
	}

	if (missingLayers.length === 0) {
		return bitmaps;
	}

	const parsedSvgRoot = parseSvgRoot(combinedSvg);
	const serializer = new XMLSerializer();

	for (const layer of missingLayers) {
		const cacheKey = toLayerBitmapCacheKey(
			layer.id,
			layer.rotation,
			cutoutStrokeWidthMm,
			dialDiameterMm
		);

		const cutoutOnlySvg = buildCutoutOnlyLayerSvg(parsedSvgRoot, layer.id, serializer);
		if (!cutoutOnlySvg) {
			continue;
		}

		const strokedCutoutSvg = applyCutoutStrokeForBitmap(
			cutoutOnlySvg,
			cutoutStrokeWidthMm,
			dialDiameterMm,
			RENDER_SIZE
		);
		const bitmap = await renderSvgToBitmap(strokedCutoutSvg, RENDER_SIZE, RENDER_SIZE);
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

function createIsolatedSvgDocument(
	sourceRoot: SVGSVGElement,
	includeSharedChildren: boolean
): { isolatedDoc: Document; isolatedRoot: SVGSVGElement } {
	const svgNamespace = sourceRoot.namespaceURI ?? 'http://www.w3.org/2000/svg';
	const isolatedDoc = document.implementation.createDocument(svgNamespace, 'svg', null);
	const isolatedRoot = isolatedDoc.documentElement as unknown as SVGSVGElement;

	copySvgRootAttributes(sourceRoot, isolatedRoot);

	if (includeSharedChildren) {
		cloneSharedSvgChildren(sourceRoot, isolatedRoot);
	}

	return { isolatedDoc, isolatedRoot };
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

	const { isolatedRoot } = createIsolatedSvgDocument(sourceRoot, true);

	const layerClone = sourceLayer.cloneNode(true) as Element;
	if (!pruneToCutoutSubtree(layerClone)) {
		return null;
	}

	isolatedRoot.appendChild(layerClone);
	return serializer.serializeToString(isolatedRoot);
}

function buildCutoutOnlyVisibleLayersSvg(
	sourceRoot: SVGSVGElement,
	visibleLayerIds: string[],
	serializer: XMLSerializer
): string | null {
	if (visibleLayerIds.length === 0) {
		return null;
	}

	const { isolatedRoot } = createIsolatedSvgDocument(sourceRoot, true);

	let hasCutoutLayer = false;
	const uniqueVisibleLayerIds = new Set(visibleLayerIds);

	for (const layerId of uniqueVisibleLayerIds) {
		const layerSelector = `[id="${escapeAttributeValue(layerId)}"]`;
		const sourceLayer = sourceRoot.querySelector(layerSelector);
		if (!sourceLayer) {
			continue;
		}

		const layerClone = sourceLayer.cloneNode(true) as Element;
		if (!pruneToCutoutSubtree(layerClone)) {
			continue;
		}

		hasCutoutLayer = true;
		isolatedRoot.appendChild(layerClone);
	}

	if (!hasCutoutLayer) {
		return null;
	}

	return serializer.serializeToString(isolatedRoot);
}

function buildLabelPolygonMaskSvg(
	sourceRoot: SVGSVGElement,
	labelCorners: Array<{ x: number; y: number }>,
	serializer: XMLSerializer
): string | null {
	if (labelCorners.length < 3) {
		return null;
	}

	for (const corner of labelCorners) {
		if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) {
			return null;
		}
	}

	const { isolatedDoc, isolatedRoot } = createIsolatedSvgDocument(sourceRoot, false);
	const svgNamespace = sourceRoot.namespaceURI ?? 'http://www.w3.org/2000/svg';

	const polygon = isolatedDoc.createElementNS(svgNamespace, 'polygon');
	polygon.setAttribute('points', labelCorners.map((corner) => `${corner.x},${corner.y}`).join(' '));
	polygon.setAttribute('fill', 'white');
	polygon.setAttribute('stroke', 'none');

	isolatedRoot.appendChild(polygon);
	return serializer.serializeToString(isolatedRoot);
}

function applyCutoutStrokeForBitmap(
	svgString: string,
	cutoutStrokeWidthMm: number | undefined,
	dialDiameterMm: number | undefined,
	renderSize: number
): string {
	if (
		typeof cutoutStrokeWidthMm !== 'number' ||
		typeof dialDiameterMm !== 'number' ||
		!Number.isFinite(cutoutStrokeWidthMm) ||
		!Number.isFinite(dialDiameterMm) ||
		cutoutStrokeWidthMm <= 0 ||
		dialDiameterMm <= 0
	) {
		return svgString;
	}

	const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
	const strokeWidthPx = (cutoutStrokeWidthMm / dialDiameterMm) * renderSize;

	doc.querySelectorAll('.cutout').forEach((cutout) => {
		cutout.setAttribute('fill', 'none');
		cutout.setAttribute('stroke', 'white');
		cutout.setAttribute('stroke-width', String(strokeWidthPx));
	});

	return new XMLSerializer().serializeToString(doc.documentElement);
}

async function renderSvgToBitmap(
	svgString: string,
	width: number,
	height: number
): Promise<PixelData> {
	let context: CanvasRenderingContext2D;
	try {
		context = acquireRenderContext(width, height);
	} catch (e) {
		throw new Error('Failed to acquire canvas context for overlap detection rendering');
	}
	context.clearRect(0, 0, width, height);

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			context.drawImage(img, 0, 0, width, height);
			const imageData = context.getImageData(0, 0, width, height).data;
			const alpha = new Uint8ClampedArray(width * height);
			for (let sourceIndex = 3, alphaIndex = 0; sourceIndex < imageData.length; sourceIndex += 4) {
				alpha[alphaIndex] = imageData[sourceIndex];
				alphaIndex += 1;
			}

			URL.revokeObjectURL(img.src);
			resolve({ alpha, width, height });
		};
		img.onerror = (error) => {
			URL.revokeObjectURL(img.src);
			reject(error);
		};

		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		img.src = URL.createObjectURL(svgBlob);
	});
}

let pooledCanvas: HTMLCanvasElement | null = null;
let pooledContext: CanvasRenderingContext2D | null = null;

function acquireRenderContext(width: number, height: number): CanvasRenderingContext2D {
	if (!pooledCanvas) {
		pooledCanvas = document.createElement('canvas');
	}

	if (!pooledContext) {
		pooledContext = pooledCanvas.getContext('2d', { willReadFrequently: true });
	}

	if (!pooledContext) {
		throw new Error('Unable to acquire 2D canvas context for overlap detection');
	}

	if (pooledCanvas.width !== width) {
		pooledCanvas.width = width;
	}
	if (pooledCanvas.height !== height) {
		pooledCanvas.height = height;
	}

	return pooledContext;
}

function bitmapsOverlap(a: PixelData, b: PixelData): boolean {
	for (let index = 0; index < a.alpha.length; index++) {
		if (a.alpha[index] > 0 && b.alpha[index] > 0) {
			return true;
		}
	}

	return false;
}

function countOverlapPixels(a: PixelData, b: PixelData): number {
	let count = 0;

	for (let index = 0; index < a.alpha.length; index++) {
		if (a.alpha[index] > 0 && b.alpha[index] > 0) {
			count += 1;
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
