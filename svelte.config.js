// import { mdsvex } from 'mdsvex';
import { mdsvex, escapeSvelte } from 'mdsvex'
import { createHighlighter } from 'shiki'
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import remarkToc from 'remark-toc'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype';
import rehypeKatexSvelte from 'rehype-katex-svelte'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'

const theme = 'synthwave-84';
const highlighter = await createHighlighter({
	themes: [theme],
	langs: ['javascript', 'typescript', 'cpp']
});

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md'],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const html = escapeSvelte(highlighter.codeToHtml(code, { lang, theme }));
			return `{@html \`${html}\` }`;
		}
	},
	remarkPlugins: [[remarkMath], [remarkToc, { tight: true }]],
	rehypePlugins: [[rehypeKatex], rehypeSlug]
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		paths: {
		  // GitHub 저장소 이름으로 변경하세요.
		  base: process.env.NODE_ENV === 'production' ? '/' : '',
		},
		prerender: {
		  handleHttpError: 'warn', // 또는 'ignore'
		  entries: ['*'],
		},
	},
};

export default config;
