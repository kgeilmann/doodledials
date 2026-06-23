export function combineMultiGroupSvg(subSvgs: string[], spacing: number): string {
	if (subSvgs.length === 0) return '';

	const firstMatch = subSvgs[0].match(/viewBox="([^"]*)"/);
	const firstVb = firstMatch ? firstMatch[1].split(/\s+/).map(Number) : [0, 0, 200, 200];
	const subDialWidth = firstVb[2] + spacing;
	const subDialHeight = firstVb[3] + spacing;

	const count = subSvgs.length;
	const cols = Math.ceil(Math.sqrt(count));
	const rows = Math.ceil(count / cols);
	const totalWidth = cols * subDialWidth;
	const totalHeight = rows * subDialHeight;

	const defsMatch = subSvgs[0].match(/(<defs>[\s\S]*?<\/defs>|<style[^>]*>[\s\S]*?<\/style>)/i);
	const defsContent = defsMatch ? defsMatch[0] : '';

	const xmlnsMatch = subSvgs[0].match(/xmlns(?::\w+)?="[^"]*"/g) || [];
	const xmlnsAttrs = xmlnsMatch.filter((a) => a !== 'xmlns="http://www.w3.org/2000/svg"').join(' ');
	const xmlnsStr = xmlnsAttrs ? ' ' + xmlnsAttrs : '';

	let result = `<svg xmlns="http://www.w3.org/2000/svg"${xmlnsStr} viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">`;
	if (defsContent) {
		result += defsContent;
	}

	for (let i = 0; i < subSvgs.length; i++) {
		const innerMatch = subSvgs[i].match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
		const innerContent = innerMatch ? innerMatch[1] : subSvgs[i];
		const col = i % cols;
		const row = Math.floor(i / cols);
		const tx = col * subDialWidth;
		const ty = row * subDialHeight;
		result += `<g transform="translate(${tx}, ${ty})">${innerContent}</g>`;
	}

	result += '</svg>';
	return result;
}
