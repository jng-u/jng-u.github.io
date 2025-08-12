<script lang="ts">
	import * as config from '$lib/config'

	let { data } = $props()
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<nav>
	<h1> Tags </h1>
</nav>

<section>
	{#each Object.entries(data) as [tag, count]}
		<a href="tags/{tag}" class="secondary tag"> 
			#{tag}({count}) 
		</a>
	{/each}
</section>

<style>
	.tag {
		text-decoration: none;
		padding-inline-end: 1em;
		display: inline-flex;
	}
	.tag:hover {
		text-decoration: underline;
	}
</style>
