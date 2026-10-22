---
version: 1
slug: 'src-routes-ff-dense-map-page-svelte'
primary_target: 'src/routes/ff-dense-map/+page.svelte'
related_targets: ['src/lib/components/PointCloudViewer.svelte']
---

# FF Dense Map

- Scope: `/ff-dense-map`; Operate/Experience surface for comparing four dense reconstructions of EuRoC `MH_01_easy`.
- Audience job: inspect map structure and reconstruction differences in-browser without desktop point-cloud software.
- Content: SQRT-VINS dense metric map, FoundationVIO loop-closure off/on runs, and DAVIO final active map. No trajectories or evaluation metrics.
- Chosen direction: quiet, viewport-wide dark 2×2 inspection bench on desktop, stacked viewers on mobile, with the map artifact visually dominant.
- Memorable interaction: synchronized orbit, right-drag pan, and zoom across all four maps, with per-view reset, fullscreen, and explicit zoom controls.
- Constraints: static SvelteKit output, repository-owned web-ready PLY assets, no new runtime dependency, responsive and keyboard-accessible controls.
- Unresolved: none for the current four-result comparison.
