import { SVG, Container } from '@svgdotjs/svg.js';
import type { DialConfig, SVGContent } from '$lib/types/doodledial';

export function combineDoodledial(content: SVGContent, config: DialConfig): string {
	const ct = SVG(content.raw) as Container;
	const vw = ct.viewbox().width;
	const vh = ct.viewbox().height;
	const max = Math.max(vw, vh);
	const diameter = 2 * max * Math.SQRT2;

	ct.size(2 * max * Math.SQRT2, 2 * max * Math.SQRT2);
	ct.viewbox(0, 0, diameter, diameter);

	let g = SVG().group();
	g.transform({ translateX: Math.abs(diameter - vw) / 2, translateY: Math.abs(diameter - vh) / 2 });
	for (const c of ct.children()) {
		c.remove();
		g.add(c);
	}

	const g2 = SVG().group();
	g2.circle(diameter / 2)
		.center(diameter / 2, diameter / 2)
		.fill('none')
		.stroke({ color: 'black', width: config.borderWidth });

	g2.putIn(ct);
	g.putIn(ct);

	if ('width' in ct.css()) {
		//@ts-ignore
		ct.css('width', null);
	}
	if ('height' in ct.css()) {
		//@ts-ignore
		ct.css('height', null);
	}

	ct.width(`${config.diameter}mm`);
	ct.height(`${config.diameter}mm`);
	return ct.svg();
}

export function exportDoodledial(content: SVGContent, config: DialConfig): string {
	return combineDoodledial(content, config);
}
