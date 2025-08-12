<script lang="ts">
	import { siGithub, siLinkedin } from 'simple-icons'
	import Toggle from './component/toggle.svelte'
	import * as config from '$lib/config'

	import { page } from '$app/state';
	// Subscribe to the current URL
	let currentPath = $derived(page.url.pathname);
</script>

<nav>
	<ul>
		<li>
			<a href="/" class="contrast title"> <b>{config.title}</b> </a>
		</li>
		<!-- <li>
			<a href="/about" class={(currentPath === "/about")? "contrast" : "secondary"}>About</a>
		</li> -->
		<li>
			<a href="/publications" class={(currentPath === "/publications")? "contrast" : "secondary"}>Publications</a>
		</li>
		<li>
			<a href="/posts" class={(currentPath === "/posts")? "contrast" : "secondary"}>Posts</a>
		</li>
	</ul>

    <ul>
        <li>
			<a href="https://github.com/jng-u" target="_blank" class="contrast" aria-label="github">
				<div style="width:24px;">
					{@html siGithub.svg}
				</div>
				<!-- <Icon siObject={siGithub} /> -->
			</a>
		</li>
        <li>
            <a href="https://www.linkedin.com/in/jng-u" target="_blank" class="contrast" aria-label="linkedin">
				<div style="width:24px;">
					{@html siLinkedin.svg}
				</div>
            </a>
        </li>
		<li>
			<Toggle />
		</li>
    </ul>
</nav>

<style>
	.title:hover {
		text-decoration: none;
	}
	li {		
		display: flex;
		align-items: center; /* 세로 정렬 */
		justify-content: center; /* 가로 정렬 */
	}
</style>
