import type { LabelPlacementStatus } from '$lib/types/doodledial';
import {
	createObb,
	obbDistanceToSegment,
	obbOverlapsObb,
	type Obb,
	type Segment
} from './label-geometry';
import { detectCutoutLabelOverlapPixels } from './overlap-detection';

export interface PathLabelLayerInput {
	id: string;
	index: number;
	rotation: number;
	visible: boolean;
	labelPlacementMode?: 'auto' | 'manual';
	labelOffsetX?: number;
	labelOffsetY?: number;
}

export interface SolvePathLabelPlacementsInput {
	combinedSvg: string;
	maxRadiusPx: number;
	ringStepPx?: number;
	angleStepDeg?: number;
	layers: PathLabelLayerInput[];
	pathAnchors: Record<string, { x: number; y: number }>;
	labelSizeByLayerId?: Record<string, { width: number; height: number }>;
	markLines: Segment[];
	markLabelObbs: Obb[];
	alreadyPlacedLabelObbs: Obb[];
	labelPaddingPx?: number;
	markLineClearancePx?: number;
	visibleLayerIds?: string[];
}

export interface SolvedPathLabelPlacement {
	offsetX: number;
	offsetY: number;
	status: LabelPlacementStatus;
	obb: Obb | null;
}

export interface SolvePathLabelPlacementsResult {
	byLayerId: Record<string, SolvedPathLabelPlacement>;
}

interface Candidate {
	offsetX: number;
	offsetY: number;
	obb: Obb;
}

const DEFAULT_LABEL_WIDTH = 14;
const DEFAULT_LABEL_HEIGHT = 6;
const DEFAULT_RING_STEP_PX = 2;
const DEFAULT_ANGLE_STEP_DEG = 30;
const DEFAULT_LABEL_PADDING_PX = 0.5;
const DEFAULT_MARK_LINE_CLEARANCE_PX = 1;

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function getAngleOffsets(stepDeg: number): number[] {
	const safeStep = Math.max(1, Math.floor(stepDeg));
	const offsets: number[] = [0];

	for (let current = safeStep; current < 180; current += safeStep) {
		offsets.push(current, -current);
	}

	offsets.push(180);
	return offsets;
}

function buildCandidatesForLayer(
	layer: PathLabelLayerInput,
	anchor: { x: number; y: number },
	labelSize: { width: number; height: number },
	maxRadiusPx: number,
	ringStepPx: number,
	angleStepDeg: number
): Candidate[] {
	const candidates: Candidate[] = [];
	const preferredAngle = normalizeAngle(layer.rotation);
	const angleOffsets = getAngleOffsets(angleStepDeg);

	for (let radius = 0; radius <= maxRadiusPx; radius += ringStepPx) {
		for (const offset of angleOffsets) {
			if (radius === 0 && offset !== 0) {
				continue;
			}

			const absoluteAngle = normalizeAngle(preferredAngle + offset);
			const radians = (absoluteAngle * Math.PI) / 180;
			const centerX = anchor.x + Math.cos(radians) * radius;
			const centerY = anchor.y + Math.sin(radians) * radius;
			const obb = createObb({
				cx: centerX,
				cy: centerY,
				width: labelSize.width,
				height: labelSize.height,
				angleDeg: layer.rotation
			});

			candidates.push({
				offsetX: centerX - anchor.x,
				offsetY: centerY - anchor.y,
				obb
			});
		}
	}

	return candidates;
}

export async function solvePathLabelPlacements(
	input: SolvePathLabelPlacementsInput
): Promise<SolvePathLabelPlacementsResult> {
	const byLayerId: Record<string, SolvedPathLabelPlacement> = {};
	const sortedLayers = [...input.layers].sort((a, b) => {
		if (a.index !== b.index) {
			return a.index - b.index;
		}

		return a.id.localeCompare(b.id);
	});

	const ringStepPx = Math.max(1, input.ringStepPx ?? DEFAULT_RING_STEP_PX);
	const angleStepDeg = Math.max(1, input.angleStepDeg ?? DEFAULT_ANGLE_STEP_DEG);
	const maxRadiusPx = Math.max(0, input.maxRadiusPx);
	const labelPaddingPx = Math.max(0, input.labelPaddingPx ?? DEFAULT_LABEL_PADDING_PX);
	const markLineClearancePx = Math.max(
		0,
		input.markLineClearancePx ?? DEFAULT_MARK_LINE_CLEARANCE_PX
	);

	const placedLabelObbs: Obb[] = [...input.alreadyPlacedLabelObbs];
	const visibleLayerIds =
		input.visibleLayerIds ?? sortedLayers.filter((layer) => layer.visible).map((layer) => layer.id);

	for (const layer of sortedLayers) {
		if (!layer.visible || layer.labelPlacementMode === 'manual') {
			byLayerId[layer.id] = {
				offsetX: layer.labelOffsetX ?? 0,
				offsetY: layer.labelOffsetY ?? 0,
				status: { status: 'placed' },
				obb: null
			};
			continue;
		}

		const anchor = input.pathAnchors[layer.id];
		if (!anchor) {
			byLayerId[layer.id] = {
				offsetX: layer.labelOffsetX ?? 0,
				offsetY: layer.labelOffsetY ?? 0,
				status: { status: 'error', reason: 'no-valid-position-within-radius' },
				obb: null
			};
			continue;
		}

		const size = input.labelSizeByLayerId?.[layer.id] ?? {
			width: DEFAULT_LABEL_WIDTH,
			height: DEFAULT_LABEL_HEIGHT
		};
		const candidates = buildCandidatesForLayer(
			layer,
			anchor,
			size,
			maxRadiusPx,
			ringStepPx,
			angleStepDeg
		);

		let accepted: Candidate | null = null;

		for (const candidate of candidates) {
			const collidesPlacedLabel = placedLabelObbs.some((placedLabel) =>
				obbOverlapsObb(candidate.obb, placedLabel, labelPaddingPx)
			);
			if (collidesPlacedLabel) {
				continue;
			}

			const collidesMarkLine = input.markLines.some(
				(markLine) => obbDistanceToSegment(candidate.obb, markLine) <= markLineClearancePx
			);
			if (collidesMarkLine) {
				continue;
			}

			const collidesMarkLabel = input.markLabelObbs.some((markLabelObb) =>
				obbOverlapsObb(candidate.obb, markLabelObb, labelPaddingPx)
			);
			if (collidesMarkLabel) {
				continue;
			}

			const cutoutOverlapPixels = await detectCutoutLabelOverlapPixels({
				combinedSvg: input.combinedSvg,
				labelCorners: candidate.obb.corners,
				visibleLayerIds
			});
			if (cutoutOverlapPixels > 0) {
				continue;
			}

			accepted = candidate;
			break;
		}

		if (!accepted) {
			byLayerId[layer.id] = {
				offsetX: layer.labelOffsetX ?? 0,
				offsetY: layer.labelOffsetY ?? 0,
				status: { status: 'error', reason: 'no-valid-position-within-radius' },
				obb: null
			};
			continue;
		}

		placedLabelObbs.push(accepted.obb);
		byLayerId[layer.id] = {
			offsetX: accepted.offsetX,
			offsetY: accepted.offsetY,
			status: { status: 'placed' },
			obb: accepted.obb
		};
	}

	return { byLayerId };
}
