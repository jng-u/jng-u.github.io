<script lang="ts">
	import Footer from './footer.svelte'
	import Header from './header.svelte'

	import 'open-props/style'
	import 'open-props/normalize'
	import 'open-props/buttons'
	import '@picocss/pico'
	// import '@picocss/pico/scss/pico.scss'
	import '../app.css'

	let { children, data } = $props()
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" integrity="sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP" crossorigin="anonymous">
</svelte:head>

<Header />

<main>
	{@render children?.()}
</main>

<hr>
<Footer />

<style>
	main {
		padding-block: var(--size-5) 0;
	}
	
</style>
