declare module 'potrace' {
	interface Potrace {
		setParameters(params: { alphamax?: number; optcurve?: boolean; threshold?: number }): void;
		loadImage(buffer: Buffer, callback: (err: Error | null) => void): void;
		getPathTag(): string;
		getSVG(): string;
	}

	interface PotraceConstructor {
		new (): Potrace;
	}

	const potrace: {
		Potrace: PotraceConstructor;
		trace: (
			source: string | Buffer,
			options?: object,
			callback?: (err: Error | null, svg: string) => void
		) => void;
		posterize: (
			source: string | Buffer,
			options?: object,
			callback?: (err: Error | null, svg: string) => void
		) => void;
	};

	export default potrace;
}
