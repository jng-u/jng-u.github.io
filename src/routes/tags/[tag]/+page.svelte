<script lang="ts">
	import * as config from '$lib/config'
	import { formatDate } from '$lib/utils'
    import type { Post } from '$lib/types';

	let { data } = $props();

    let tag = data.tag; // 현재 태그
    let posts = data.posts; // 현재 태그에 속한 게시물
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<nav>
	<h1> #{tag} </h1>
</nav>

<section>
	{#each posts as post}
		<hgroup class="post">
			<h4> 
				<a href="/posts/{post.slug}" class="contrast title">{post.title}</a> 
			</h4>
			<i class="color-secondary">{formatDate(post.date)}</i>
			<div data-sveltekit-reload>
			{#each post.tags as post_tag}
				<a href="/tags/{post_tag}" class="secondary tag"> #{post_tag} </a>
			{/each}
			</div>
		</hgroup>
	{/each}
</section>

<style>
	.post {
		margin-top: var(--size-9);
		margin-bottom: var(--size-9);

		.title {
			text-decoration: none;
		}

		.title:hover {
			text-decoration: underline;
		}
	}

	.tag {
		margin-inline-end: 0.5em;
		text-decoration: none;
	}
	
</style>
