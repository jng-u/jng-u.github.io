<script lang="ts">
	import { base } from '$app/paths';
	import PointCloudViewer from '$lib/components/PointCloudViewer.svelte';
	import { Link2 } from 'lucide-svelte';

	interface CameraView {
		yaw: number;
		pitch: number;
		zoom: number;
		panX: number;
		panY: number;
	}

	interface MapEntry {
		id: string;
		name: string;
		variant: string;
		file: string;
		accent: string;
		points: number;
	}

	interface Manifest {
		sequence: string;
		maps: MapEntry[];
	}

	const manifest: Manifest = {
		sequence: 'EuRoC MH_01_easy',
		maps: [
			{
				id: 'sqrt-vins',
				name: 'SQRT-VINS',
				variant: 'FF dense metric map',
				file: 'sqrt-vins.ply',
				accent: '#f6c453',
				points: 180000
			},
			{
				id: 'foundation-no-loop',
				name: 'FoundationVIO',
				variant: 'Loop closure off · 18:05:15',
				file: 'foundation-no-loop.ply',
				accent: '#7dd3fc',
				points: 180000
			},
			{
				id: 'foundation-loop',
				name: 'FoundationVIO',
				variant: 'Loop closure on · 18:08:49',
				file: 'foundation-loop.ply',
				accent: '#a7f3d0',
				points: 180000
			},
			{
				id: 'davio',
				name: 'DAVIO',
				variant: 'Final active map',
				file: 'davio.ply',
				accent: '#f0abfc',
				points: 180000
			}
		]
	};

	let viewsLinked = true;
	let sharedView: CameraView = { yaw: -0.62, pitch: -0.42, zoom: 1, panX: 0, panY: 0 };

	function updateSharedView(view: CameraView) {
		if (viewsLinked) sharedView = view;
	}
</script>

<svelte:head>
	<title>FF Dense Map · jng-u</title>
	<meta
		name="description"
		content="Interactive comparison of four dense 3D maps reconstructed from EuRoC MH_01_easy."
	/>
</svelte:head>

<div class="dense-map-page">
	<header class="page-heading">
		<div>
			<h1>FF Dense Map</h1>
			<p>{manifest.sequence} · four reconstructions</p>
		</div>
		<label class:active={viewsLinked}>
			<Link2 size={15} strokeWidth={1.8} />
			<span>Sync views</span>
			<input type="checkbox" bind:checked={viewsLinked} />
		</label>
	</header>

	<div class="map-grid">
		{#each manifest.maps as map (map.id)}
			<PointCloudViewer
				source={`${base}/ff-dense-map/${map.file}`}
				name={map.name}
				variant={map.variant}
				accent={map.accent}
				pointCount={map.points}
				linkedView={viewsLinked ? sharedView : null}
				onViewChange={updateSharedView}
			/>
		{/each}
	</div>
</div>

<style>
	.dense-map-page {
		--page-surface: #080d11;
		box-sizing: border-box;
		width: calc(100vw - 2rem);
		margin-top: calc(var(--size-5) * -1);
		margin-left: calc(50% - 50vw + 1rem);
		padding: 1.35rem;
		border-radius: 16px;
		background: var(--page-surface);
		box-shadow: 0 24px 70px -44px rgba(0, 0, 0, 0.9);
		color: #eef3f5;
		isolation: isolate;
	}

	.page-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	h1,
	p {
		max-width: none;
		margin: 0;
	}

	h1 {
		color: #f6f9fa;
		font-size: clamp(1.15rem, 1.6vw, 1.35rem);
		font-weight: 680;
		letter-spacing: -0.025em;
	}

	p {
		margin-top: 0.12rem;
		color: #9aabb4;
		font-size: 0.76rem;
		font-variant-numeric: tabular-nums;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 36px;
		margin: 0;
		padding: 0.4rem 0.55rem 0.4rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		background: #10171d;
		color: #aab6bd;
		font-size: 0.72rem;
		user-select: none;
		cursor: pointer;
	}

	label.active {
		border-color: rgba(125, 211, 252, 0.38);
		color: #e7f7ff;
	}

	input {
		width: 2rem;
		height: 1.1rem;
		margin: 0 0 0 0.15rem;
	}

	.map-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-auto-rows: minmax(460px, calc((100vh - 6rem) / 2));
		gap: 0.85rem;
	}

	:global(::selection) {
		background: rgba(125, 211, 252, 0.28);
		color: #fff;
	}

	@media (max-width: 760px) {
		.dense-map-page {
			width: calc(100vw - 1rem);
			margin-left: calc(50% - 50vw + 0.5rem);
			padding: 0.9rem;
			border-radius: 12px;
		}

		.map-grid {
			grid-template-columns: 1fr;
			grid-auto-rows: minmax(440px, 68svh);
		}

		.page-heading {
			align-items: flex-end;
		}

		label span {
			display: none;
		}
	}
</style>
