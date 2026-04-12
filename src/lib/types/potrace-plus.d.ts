declare module 'potrace-plus' {
	interface PotracePlusOptions {
		turnpolicy?: 'black' | 'white' | 'left' | 'right' | 'majority' | 'minority';
		turdsize?: number;
		alphamax?: number;
		optcurve?: boolean;
		opttolerance?: number;
		threshold?: number;
		color?: string;
		stroke?: string;
		strokeWidth?: number;
		fill?: boolean;
		background?: string;
	}

	interface PotracePlusResult {
		svg: string;
		d: string;
		width: number;
		height: number;
		commands: string;
		pathData: string;
	}

	export function PotracePlus(
		source:
			| HTMLCanvasElement
			| HTMLImageElement
			| HTMLVideoElement
			| SVGImageElement
			| ImageData
			| ImageBitmap
			| Blob,
		options?: PotracePlusOptions
	): Promise<PotracePlusResult>;
}
