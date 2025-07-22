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

<div class="container">
	<Header />

	<main class="container">
		{@render children?.()}
	</main>

	<hr>
	<Footer />
</div>

<style>
	.container main {
		padding-block: var(--size-9) 0;
	}
	
</style>
