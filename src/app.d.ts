/// <reference types="@sveltejs/kit" />

declare module 'three/examples/jsm/exporters/STLExporter.js' {
	import type { Object3D } from 'three';

	export class STLExporter {
		parse(object: Object3D, options?: { binary?: boolean }): string | ArrayBuffer;
	}
}
