<script lang="ts">
	import { formatDate } from '$lib/utils'
	import * as config from '$lib/config'

	let { data } = $props()
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<nav class="posts-nav">
	<h1> Posts </h1>
	<a href="/tags" class="secondary"> View all tags</a>
</nav>

<section>
	{#each data.posts as post}
		<hgroup class="post">
			<h4> 
				<a href="posts/{post.slug}" class="contrast title">{post.title}</a> 
			</h4>
			<i class="color-secondary">{formatDate(post.date)}</i>
			<div>
			{#each post.tags as tag}
				<a href="tags/{tag}" class="secondary tag"> #{tag} </a>
			{/each}
			</div>
		</hgroup>
	{/each}
</section>

<style>
	.posts-nav {
		align-items: end;

		a {
			height: fit-content;
			margin-bottom: var(--pico-typography-spacing-vertical);
		}
	}

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
	.tag:hover {
		text-decoration: underline;
	}
	

</style>
