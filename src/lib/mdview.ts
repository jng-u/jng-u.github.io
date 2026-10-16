export type ViewerFile = {
	file: File;
	name: string;
	path: string;
	searchText: string;
};

const MARKDOWN_EXTENSION = /\.(?:md|markdown)$/i;
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const DANGEROUS_TAGS = new Set([
	'base',
	'embed',
	'form',
	'iframe',
	'link',
	'meta',
	'object',
	'script',
	'style'
]);
const ALLOWED_TAGS = new Set([
	'a',
	'abbr',
	'annotation',
	'b',
	'blockquote',
	'br',
	'code',
	'dd',
	'del',
	'details',
	'div',
	'dl',
	'dt',
	'em',
	'figcaption',
	'figure',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'i',
	'img',
	'input',
	'kbd',
	'li',
	'mark',
	'math',
	'mfrac',
	'mi',
	'mn',
	'mo',
	'mover',
	'mpadded',
	'mphantom',
	'mrow',
	'mroot',
	'mspace',
	'msqrt',
	'mstyle',
	'msub',
	'msubsup',
	'msup',
	'mtable',
	'mtd',
	'mtext',
	'mtr',
	'munder',
	'munderover',
	'ol',
	'p',
	'pre',
	'q',
	'path',
	's',
	'samp',
	'section',
	'semantics',
	'small',
	'span',
	'strong',
	'svg',
	'sub',
	'summary',
	'sup',
	'table',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
	'var'
]);
const GLOBAL_ATTRIBUTES = new Set(['aria-hidden', 'aria-label', 'class', 'role', 'title']);
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
	a: new Set(['href']),
	annotation: new Set(['encoding']),
	img: new Set(['alt', 'height', 'loading', 'src', 'width']),
	input: new Set(['checked', 'disabled', 'type']),
	math: new Set(['display', 'xmlns']),
	mi: new Set(['mathvariant']),
	path: new Set(['d']),
	svg: new Set(['height', 'viewbox', 'width', 'xmlns']),
	td: new Set(['colspan', 'rowspan']),
	th: new Set(['colspan', 'rowspan', 'scope'])
};

export function isMarkdownPath(path: string): boolean {
	return MARKDOWN_EXTENSION.test(path);
}

/** Converts LaTeX-style math delimiters without touching fenced or inline code. */
export function normalizeMathDelimiters(markdown: string): string {
	const lines = markdown.split(/(?<=\n)/);
	let fence: { character: '`' | '~'; length: number } | null = null;
	let inlineTicks = 0;

	return lines
		.map((line) => {
			const fenceMatch = /^(?: {0,3})(`{3,}|~{3,})/.exec(line);
			if (fenceMatch) {
				const marker = fenceMatch[1];
				if (!marker) return line;
				const character = marker[0] as '`' | '~';
				if (!fence && inlineTicks === 0) fence = { character, length: marker.length };
				else if (fence && fence.character === character && marker.length >= fence.length) {
					fence = null;
				}
				return line;
			}
			if (fence) return line;

			let result = '';
			for (let index = 0; index < line.length; ) {
				if (line[index] === '`') {
					let end = index + 1;
					while (line[end] === '`') end += 1;
					const length = end - index;
					if (inlineTicks === 0) inlineTicks = length;
					else if (inlineTicks === length) inlineTicks = 0;
					result += line.slice(index, end);
					index = end;
					continue;
				}

				if (inlineTicks === 0 && line[index] === '\\') {
					let end = index + 1;
					while (line[end] === '\\') end += 1;
					const slashCount = end - index;
					const delimiter = line[end];
					if (slashCount % 2 === 1 && delimiter && '()[]'.includes(delimiter)) {
						result += '\\'.repeat(slashCount - 1);
						result += delimiter === '(' || delimiter === ')' ? '$' : '$$';
						index = end + 1;
						continue;
					}
				}

				result += line[index];
				index += 1;
			}
			return result;
		})
		.join('');
}

export function normalizePath(basePath: string, reference: string): string | undefined {
	let decoded: string;
	try {
		decoded = decodeURIComponent(reference.split(/[?#]/, 1)[0] ?? '');
	} catch {
		return undefined;
	}

	if (!decoded || decoded.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(decoded)) return undefined;

	const segments = decoded.startsWith('/') ? [] : basePath.split('/').slice(0, -1);
	for (const segment of decoded.replaceAll('\\', '/').split('/')) {
		if (!segment || segment === '.') continue;
		if (segment === '..') {
			if (!segments.length) return undefined;
			segments.pop();
			continue;
		}
		segments.push(segment);
	}

	return segments.join('/') || undefined;
}

export async function renderMarkdown(
	source: string,
	path: string,
	filesByPath: ReadonlyMap<string, File>,
	imageUrls: Map<string, string>
): Promise<string> {
	const [{ compile }, { default: remarkMath }, { default: rehypeKatexSvelte }] = await Promise.all([
		import('mdsvex/dist/browser-es.js'),
		import('remark-math'),
		import('rehype-katex-svelte')
	]);
	const result = await compile(normalizeMathDelimiters(source), {
		filename: path,
		extensions: ['.md', '.markdown'],
		highlight: false,
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatexSvelte]
	});
	const expanded = unwrapGeneratedHtml(result?.code ?? '');
	const document = new DOMParser().parseFromString(expanded, 'text/html');

	for (const element of [...document.body.querySelectorAll('*')]) {
		const tagName = element.tagName.toLowerCase();
		if (DANGEROUS_TAGS.has(tagName)) {
			element.remove();
			continue;
		}
		if (!ALLOWED_TAGS.has(tagName)) {
			element.replaceWith(document.createTextNode(element.textContent ?? ''));
			continue;
		}

		for (const attribute of [...element.attributes]) {
			const name = attribute.name.toLowerCase();
			if (name === 'style') {
				const safeStyle = sanitizeKatexStyle(element, attribute.value);
				if (safeStyle) element.setAttribute('style', safeStyle);
				else element.removeAttribute('style');
				continue;
			}
			if (!GLOBAL_ATTRIBUTES.has(name) && !TAG_ATTRIBUTES[tagName]?.has(name)) {
				element.removeAttribute(attribute.name);
			}
		}

		if (tagName === 'a') prepareLink(element as HTMLAnchorElement, path, filesByPath);
		if (tagName === 'img') prepareImage(element as HTMLImageElement, path, filesByPath, imageUrls);
		if (tagName === 'input') prepareCheckbox(element as HTMLInputElement);
	}

	return document.body.innerHTML;
}

function sanitizeKatexStyle(element: Element, style: string): string {
	if (!element.closest('.katex')) return '';
	const allowedProperties = new Set([
		'height',
		'left',
		'margin-left',
		'margin-right',
		'min-width',
		'top',
		'vertical-align',
		'width'
	]);
	const safeValue = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?$/;
	return style
		.split(';')
		.map((declaration) => declaration.trim())
		.filter(Boolean)
		.map((declaration) => declaration.split(':', 2).map((part) => part.trim()))
		.filter(
			([property, value]) => allowedProperties.has(property ?? '') && safeValue.test(value ?? '')
		)
		.map(([property, value]) => `${property}:${value}`)
		.join(';');
}

function unwrapGeneratedHtml(source: string): string {
	return source.replace(/\{@html\s+("(?:\\.|[^"\\])*")\}/g, (_, encoded: string) => {
		try {
			return JSON.parse(encoded) as string;
		} catch {
			return '';
		}
	});
}

function prepareLink(
	element: HTMLAnchorElement,
	currentPath: string,
	filesByPath: ReadonlyMap<string, File>
) {
	const href = element.getAttribute('href')?.trim() ?? '';
	const localPath = normalizePath(currentPath, href);
	if (localPath && isMarkdownPath(localPath) && filesByPath.has(localPath)) {
		element.href = '#';
		element.dataset.mdPath = localPath;
		return;
	}

	if (!/^(?:https?:|mailto:)/i.test(href)) {
		element.removeAttribute('href');
		return;
	}

	if (/^https?:/i.test(href)) {
		element.target = '_blank';
		element.rel = 'noopener noreferrer';
	}
}

function prepareImage(
	element: HTMLImageElement,
	currentPath: string,
	filesByPath: ReadonlyMap<string, File>,
	imageUrls: Map<string, string>
) {
	const source = element.getAttribute('src')?.trim() ?? '';
	const localPath = normalizePath(currentPath, source);
	if (localPath && IMAGE_EXTENSION.test(localPath)) {
		const file = filesByPath.get(localPath);
		if (file) {
			let url = imageUrls.get(localPath);
			if (!url) {
				url = URL.createObjectURL(file);
				imageUrls.set(localPath, url);
			}
			element.src = url;
			element.loading = 'lazy';
			return;
		}
	}

	if (!/^https?:/i.test(source)) {
		element.replaceWith(
			document.createTextNode(element.alt ? `[${element.alt}]` : '[이미지를 찾을 수 없습니다]')
		);
		return;
	}
	if (!element.alt) element.alt = '';
	element.loading = 'lazy';
}

function prepareCheckbox(element: HTMLInputElement) {
	if (element.type !== 'checkbox') {
		element.remove();
		return;
	}
	element.disabled = true;
}
