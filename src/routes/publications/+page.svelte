<script lang="ts">
	import * as config from '$lib/config'

	interface Pub {
		title: string
		authors: string[]
		journal: string
		img: string
		url: string
	}

	interface Pubs {
		year: string
		pubs: Pub[]
	}

	let myname: string = "";
    let all_pubs: Pubs[] = [];
    let isLoading: boolean = true;

    import { onMount } from 'svelte';
    onMount(async () => {
		try {
			const response = await fetch('pub/pub.json');
			const data = await response.json();
			myname = data.myname;
			all_pubs = data.all_pubs;
		} catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            isLoading = false; // 로딩 완료
        }
    });
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

{#if isLoading}
<div aria-busy="true"></div>
{:else}
<div>
    {#each all_pubs as yearData(yearData.year)}
		{#if yearData.pubs.length > 0}
			<h3>{yearData.year}</h3>
			{#each yearData.pubs as pub}
				<article class="paper area-1-3">
					<div class="thumbnail area1">
						<a href={pub.url} target="_blank">
							<img src={pub.img}
								alt={pub.url}/>
						</a>
					</div>
					<hgroup class="area3">
						<p class="title color-contrast"> {pub.title} </p>
						<p class="authors color-secondary">
							{#each pub.authors as author}
								{#if author === myname} <u>{author}</u> 
								{:else} {author}
								{/if}
								{#if author !== pub.authors[pub.authors.length - 1]} {", "}
								{/if}
							{/each}
						</p>
						<p class="journal color-contrast"> {pub.journal} </p>
					</hgroup>
				</article>
			{/each}
		{/if}
    {/each}
</div>
{/if}

<style>
	.thumbnail img {
		margin-left: auto;
		margin-right: auto;
		max-height: 9em;
	}
    .thumbnail:hover { 
        filter: 
            invert(0.1)
    }

    .title { 
		font-weight: 500;
    }
	.journal {
		font-style: italic;
	}
</style>
