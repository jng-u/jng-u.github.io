<script lang="ts">
	import { formatDate } from '$lib/utils'

	let { data } = $props()

</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.meta.title} />
</svelte:head>

<article class="article-post">
	<hgroup>
		<h1 class="post-title">{data.meta.title}</h1>
		<i class="color-secondary">{formatDate(data.meta.date)}</i>
		<div>
			{#each data.meta.tags as tag}
				<a href="/tags/{tag}" class="secondary tag"> #{tag} </a>
			{/each}
		</div>	
	</hgroup>
	
	<hr>

	<div>
		<!-- <svelte:component this={data.content} /> -->
		<!-- {data.content} -->
		<data.content />
	</div>
</article>

<style>
	.article-post {
		max-inline-size: 90%;
		margin-inline: auto;
	}
	.post-title {
		margin-bottom: var(--pico-typography-spacing-vertical);
	}
	.tag {
		margin-inline-end: 0.5em;
		text-decoration: none;
	}
	.tag:hover {
		text-decoration: underline;
	}
	/* article {
		max-inline-size: var(--size-content-3);
		margin-inline: auto;

		h1 {
			text-transform: capitalize;
		}

		h1 + p {
			margin-top: var(--size-2);
			color: var(--text-2);
		}

		.tags {
			display: flex;
			gap: var(--size-3);
			margin-top: var(--size-7);

			> * {
				padding: var(--size-2) var(--size-3);
				border-radius: var(--radius-round);
			}
		}
	} */
</style>
