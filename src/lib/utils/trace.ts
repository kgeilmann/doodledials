import { PotracePlus } from 'potrace-plus';

const OUTPUT_STYLE = {
	fill: '#D3D3D3',
	stroke: '#FF0000',
	strokeWidth: 0.5
};

export interface TraceResult {
	pathData: string;
	transform: string;
}

export async function renderPathToImage(
	pathData: string,
	viewBox: { width: number; height: number }
): Promise<HTMLCanvasElement> {
	const padding = Math.max(viewBox.width, viewBox.height) * 0.1;
	const width = viewBox.width + padding * 2;
	const height = viewBox.height + padding * 2;
	const scale = 2;

	const canvas = document.createElement('canvas');
	canvas.width = width * scale;
	canvas.height = height * scale;
	const ctx = canvas.getContext('2d')!;

	ctx.scale(scale, scale);
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = 'black';
	ctx.lineWidth = 1;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	ctx.beginPath();
	const path = new Path2D(pathData);
	ctx.stroke(path);

	return canvas;
}

export async function traceImage(canvas: HTMLCanvasElement): Promise<string> {
	try {
		const traced = await PotracePlus(canvas, {
			alphamax: 1,
			optcurve: true,
			threshold: 128
		});

		return traced.d || traced.pathData || '';
	} catch (error) {
		console.error('Potrace error:', error);
		throw error;
	}
}

export function applyTraceStyle(pathData: string): string {
	return `d="${pathData}" fill="${OUTPUT_STYLE.fill}" stroke="${OUTPUT_STYLE.stroke}" stroke-width="${OUTPUT_STYLE.strokeWidth}"`;
}

export async function tracePath(
	pathData: string,
	viewBox: { width: number; height: number }
): Promise<TraceResult> {
	const canvas = await renderPathToImage(pathData, viewBox);
	const tracedPathData = await traceImage(canvas);

	const pathD = tracedPathData.replace(/^d="/, '').replace(/"$/, '');

	return {
		pathData: `d="${pathD}" fill="${OUTPUT_STYLE.fill}" stroke="${OUTPUT_STYLE.stroke}" stroke-width="${OUTPUT_STYLE.strokeWidth}"`,
		transform: ''
	};
}

function extractPathData(styledPath: string): string {
	const dMatch = styledPath.match(/d="([^"]*)"/);
	const fillMatch = styledPath.match(/fill="([^"]*)"/);
	const strokeMatch = styledPath.match(/stroke="([^"]*)"/);
	const strokeWidthMatch = styledPath.match(/stroke-width="([^"]*)"/);

	if (!dMatch) return styledPath;

	let result = `d="${dMatch[1]}"`;
	if (fillMatch) result += ` fill="${fillMatch[1]}"`;
	if (strokeMatch) result += ` stroke="${strokeMatch[1]}"`;
	if (strokeWidthMatch) result += ` stroke-width="${strokeWidthMatch[1]}"`;

	return result;
}
