<script lang="ts">
	import { asset, base } from '$app/paths'
	import { onMount } from 'svelte'
	import type { AboutData, Education } from '$lib/types'

	let data: AboutData | undefined
	let groupedEducation: Record<string, Education[]> = {}
	let isLoading = true

	onMount(async () => {
		try {
			const response = await fetch(asset('/about.json'))
			if (!response.ok) {
				throw new Error(`Failed to load about data: ${response.status}`)
			}

			data = (await response.json()) as AboutData
			groupedEducation = data.education.reduce<Record<string, Education[]>>((acc, education) => {
				if (!acc[education.school]) acc[education.school] = []
				acc[education.school].push(education)
				return acc
			}, {})
		} catch (error) {
			console.error('Failed to load about data:', error)
		} finally {
			isLoading = false
		}
	})
</script>

{#if isLoading}
	<div aria-busy="true"></div>
{:else if data}
	<div>
		<article class="area-1-3 profile">
			<div class="area1">
				<img src={`${base}/${data.profile.img}`} alt="profile thumbnail" />
			</div>
			<hgroup class="area3 profile-abstract">
				<h3>{data.profile.name}</h3>
				<p>{data.profile.abstract}</p>

				<b>Research Interests</b>
				<p>{data.profile.research_interests}</p>

				<b>Skills</b>
				<p>{data.profile.skills}</p>

				<b>Contact</b>
				<p>
					<a class="contrast" href="mailto:{data.profile.contact}">{data.profile.contact}</a>
				</p>
			</hgroup>
		</article>

		<article>
			<h3>Education</h3>

			{#each Object.keys(groupedEducation) as school}
				<h5>{school}</h5>
				<ul>
					{#each groupedEducation[school] as education}
						<li>
							<i class="color-secondary">{education.start} - {education.end || 'Present'}</i><br />
							{education.description}
						</li>
					{/each}
				</ul>
			{/each}
		</article>

		<article>
			<h3>Experiences</h3>

			{#each data.experiences as experience}
				<h5>{experience.job_team}</h5>
				<i class="color-secondary">{experience.start} — {experience.end || 'Present'}</i>
				<ul>
					<li>{experience.work}</li>
					<li>{experience.tools}</li>
				</ul>
			{/each}
		</article>

		<article>
			<h3>Talks</h3>

			<ul>
				{#each data.talks as talk}
					<li>
						{talk.date},
						<a href={talk.link} target="_blank" rel="noreferrer" class="contrast">{talk.where}</a>,
						<i class="color-secondary">{talk.title}</i>
					</li>
				{/each}
			</ul>
		</article>

		<article>
			<h3>Awards</h3>

			<ul>
				{#each data.awards as award}
					<li>{award.year} {award.contest} ({award.prize})</li>
				{/each}
			</ul>
		</article>
	</div>
{:else}
	<p>About information is currently unavailable.</p>
{/if}

<style>
	h5 {
		margin-top: var(--pico-typography-spacing-vertical);
		margin-bottom: 0.25em;
	}
	h3,
	h5,
	li {
		max-inline-size: 100%;
	}
	ul {
		padding-inline-start: 20px;
	}
	.profile-abstract p {
		margin-bottom: 0.4em;
	}
</style>
