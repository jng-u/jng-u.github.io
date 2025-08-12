import { mdsvex, escapeSvelte } from 'mdsvex'
import { createHighlighter } from 'shiki'
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import remarkMath from 'remark-math';
import remarkAttr from 'remark-attr';
import rehypeKatexSvelte from 'rehype-katex-svelte';

import path from 'path';
import { visit } from 'unist-util-visit'; // visit 유틸리티 import

/**
 * 이미지 경로를 동적으로 변환하는 Rehype 플러그인
 */
const rehypeRewriteImagePath = () => {
    return (tree, file) => {
        const slug = path.basename(file.filename, '.md');

        visit(tree, 'element', (node) => {
            if (node.tagName === 'img') {
                const src = node.properties.src;
                if (src && !src.startsWith('http') && !src.startsWith('/')) {
                    node.properties.src = `/posts/${slug}/${src}`;
                }
            }
        });
    };
};

const theme = 'synthwave-84';
const highlighter = await createHighlighter({
	themes: [theme],
	langs: ['javascript', 'typescript', 'cpp', 'python', 'bash', 'shell']
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
	remarkPlugins: [remarkMath, remarkAttr],
	rehypePlugins: [rehypeKatexSvelte, rehypeRewriteImagePath]
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(), 
		mdsvex(mdsvexOptions)
	],

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		paths: {
		  // GitHub 저장소 이름으로 변경하세요.
		//   base: process.env.NODE_ENV === 'production' ? '/' : '',
		  base: '',
		},
		prerender: {
		  handleHttpError: 'warn', // 또는 'ignore'
		  entries: ['*'],
		},
	},
};

export default config;
