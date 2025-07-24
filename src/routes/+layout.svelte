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
