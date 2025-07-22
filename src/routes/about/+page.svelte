<script lang="ts">
	import * as config from '$lib/config'
    
    interface Profile {
        img: string
        name: string
        abstract: string
        research_interests: string
        skills: string
        contact: string
    }

    interface Education {
        school: string
        start: string
        end: string
        description: string
    }

    interface Experience {
        job_team: string
        start: string
        end: string
        work: string
        tools: string
    }

    interface Talk {
        date: string
        where: string
        link: string
        title: string
    }

    interface Award {
        year: string
        contest: string
        prize: string
    }

    let profile: Profile;
    let education: Education[];
    let groupedEducation: Record<string, Education[]> = {}; // 학력을 학교별로 그룹화
    let experiences: Experience[];
    let talks: Talk[];
    let awards: Award[];
    let isLoading: boolean = true;

    import { onMount } from 'svelte';
    onMount(async () => {
        try {
            const response = await fetch('about.json');
            const data = await response.json();
            profile = data.profile;
            education = data.education;
            experiences = data.experiences;
            talks = data.talks;
            awards = data.awards;

            // 학교별로 학력 데이터를 그룹화
            groupedEducation = education.reduce((acc: Record<string, Education[]>, edu) => {
                if (!acc[edu.school]) acc[edu.school] = [];
                acc[edu.school].push(edu);
                return acc;
            }, {});
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
    <article class="area-1-3 profile">
        <div class="area1">
            <img src={profile.img}
                alt="profile thumbnail"/>
        </div>
        <hgroup class="area3 profile-abstract">
            <h3> {profile.name} </h3>
            <p> {profile.abstract} </p>
            
            <b> Research Interests </b>
            <p> {profile.research_interests} </p>
            
            <b> Skills </b>
            <p> {profile.skills} </p>

            <b>Contact</b> 
            <p>
                <a class="contrast" href="mailto:{profile.contact}">{profile.contact}</a>
            </p>
        </hgroup>
    </article>

    <article>
        <h3> Education </h3>
        
        {#each Object.keys(groupedEducation) as school}
            <h5>{school}</h5>
            <ul>
                {#each groupedEducation[school] as edu}
                    <li>
                        <i class="color-secondary">{edu.start} - {edu.end || 'Present'}</i><br>
                        {edu.description}
                    </li>
                {/each}
            </ul>
        {/each}
    </article>

    <article>
        <h3> Expreiences </h3>

        {#each experiences as exp}
            <h5>{exp.job_team}</h5> 
            <i class="color-secondary">{exp.start} — {exp.end || 'Present'}</i>
            <ul>
                <li>{exp.work}</li>
                <li>{exp.tools}</li>
            </ul>
        {/each}
    </article>

    <article>
        <h3> Talks </h3>

        <ul>
            {#each talks as talk}
                <li>
                    {talk.date}, 
                    <a href={talk.link} target="_blank" class="contrast">{talk.where}</a>, 
                    <i class="color-secondary">{talk.title}</i>
                </li>
            {/each}
        </ul>
    </article>

    <article>
        <h3> Awards </h3>
        
        <ul>
            {#each awards as award}
                <li>
                    {award.year} {award.contest} ({award.prize})
                </li>
            {/each}
        </ul>
    </article>
</div>
{/if}

<style>
    h5 {
        margin-top: var(--pico-typography-spacing-vertical);
        margin-bottom: 0.25em;
    }
    h3, h5, li {
        max-inline-size: 100%;
    }
    ul {
        padding-inline-start: 20px;
    }
    .profile-abstract p {
        margin-bottom: 0.4em;
    }
</style>
