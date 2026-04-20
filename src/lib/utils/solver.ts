import { detectOverlaps, detectCutoutGaps } from './overlap-detection';
import type { Layer } from '$lib/types/doodledial';

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function calculateCircularVariance(angles: number[]): number {
	if (angles.length < 2) return 0;

	const anglesRad = angles.map((a) => toRadians(a));
	const vectors = anglesRad.map((a) => ({ x: Math.cos(a), y: Math.sin(a) }));

	const xBar = vectors.reduce((sum, v) => sum + v.x, 0) / angles.length;
	const yBar = vectors.reduce((sum, v) => sum + v.y, 0) / angles.length;

	const R = Math.sqrt(xBar * xBar + yBar * yBar);
	return 1 - R;
}

export function calculateScore(angles: number[]): number {
	const variance = calculateCircularVariance(angles);
	return 1 - variance;
}

const MIN_ANGLE_DIFF = 10;

export function hasUniqueAngles(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	const unique = new Set(angles.map((a) => Math.round(a)));
	return unique.size === angles.length;
}

export function hasMinAngleDifference(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	for (let i = 0; i < angles.length; i++) {
		for (let j = i + 1; j < angles.length; j++) {
			const diff = Math.abs(angles[i] - angles[j]);
			const minDiff = Math.min(diff, 360 - diff);
			if (minDiff < MIN_ANGLE_DIFF) {
				return false;
			}
		}
	}
	return true;
}

export function satisfiesAngleConstraints(rotations: Map<string, number>): boolean {
	return hasUniqueAngles(rotations) && hasMinAngleDifference(rotations);
}

export interface SolverSolution {
	rotations: Map<string, number>;
	score: number;
	isValid: boolean;
}

export interface SolverProgress {
	bestSolutions: SolverSolution[];
	searchedCount: number;
	isComplete: boolean;
	isAborted: boolean;
}

const GAP_MM = 2;
const STEP_SIZE = 10;
const NUM_STEPS = 36;

export async function solveDoodledial(
	layers: Layer[],
	combinedSvg: string,
	dialDiameter: number,
	onProgress: (progress: SolverProgress) => void,
	signal?: AbortSignal
): Promise<SolverSolution[]> {
	const results: SolverSolution[] = [];
	let searchedCount = 0;
	const maxResults = 10;

	function updateProgress(aborted = false) {
		const best = [...results].sort((a, b) => b.score - a.score).slice(0, maxResults);

		onProgress({
			bestSolutions: best,
			searchedCount,
			isComplete: false,
			isAborted: aborted
		});
	}

	async function checkCollision(
		layerArray: Layer[],
		rotations: Map<string, number>,
		dialDiameter: number
	): Promise<boolean> {
		const tempLayers = layerArray.map((l) => ({
			...l,
			rotation: rotations.get(l.id) ?? l.rotation
		}));

		const overlaps = await detectOverlaps(tempLayers, combinedSvg);
		if (overlaps.size > 0) return true;

		const gaps = await detectCutoutGaps(tempLayers, combinedSvg, GAP_MM, dialDiameter);
		if (gaps.size > 0) return true;

		return false;
	}

	async function checkAll(layers: Layer[]): Promise<SolverSolution | null> {
		const layerArray = [...layers].sort((a, b) => a.index - b.index);
		const n = layerArray.length;

		const totalCombinations = Math.pow(NUM_STEPS, n);

		for (let combination = 0; combination < totalCombinations; combination++) {
			if (signal?.aborted) {
				updateProgress(true);
				return null;
			}

			searchedCount = combination + 1;

			let temp = combination;
			const rotations = new Map<string, number>();
			for (let i = 0; i < n; i++) {
				const angle = (temp % NUM_STEPS) * STEP_SIZE;
				rotations.set(layerArray[i].id, angle);
				temp = Math.floor(temp / NUM_STEPS);
			}

			if (!satisfiesAngleConstraints(rotations)) continue;

			const hasCollision = await checkCollision(layerArray, rotations, dialDiameter);
			if (hasCollision) continue;

			const angles = Array.from(rotations.values());
			const score = calculateScore(angles);

			results.push({
				rotations,
				score,
				isValid: true
			});

			if (searchedCount % 1 === 0) {
				updateProgress();
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		}

		updateProgress();
		return null;
	}

	await checkAll(layers);

	const sorted = [...results].sort((a, b) => b.score - a.score);
	return sorted.slice(0, maxResults);
}
