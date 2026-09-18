<script lang="ts">
	import * as config from '$lib/config'
	import About from '$lib/components/About.svelte'
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<About />
