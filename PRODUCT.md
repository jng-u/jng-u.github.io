# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the site owner and robotics/visual-inertial SLAM peers who need to inspect and compare reconstruction outputs from the same EuRoC sequence without opening desktop visualization tools.

## Product Purpose

This personal technical site publishes research notes, publications, and selected experiment artifacts. The `ff-dense-map` surface provides a focused browser view of dense 3D maps from four local experiment outputs.

## Operating Context

The current comparison uses the EuRoC `MH_01_easy` sequence. The selected sources are one SQRT-VINS/GTSAM dense metric map, two FoundationVIO runs that differ by loop-closure configuration, and the final active DAVIO map.

## Capabilities and Constraints

- The site is a statically generated SvelteKit application deployed as a web site.
- Experiment directories outside the repository cannot be read by deployed browsers; web-ready map assets must be exported into the site.
- The requested layout is a 2 × 2 comparison grid with direct 3D rotation and zoom.
- Only dense 3D map results belong on this surface; trajectories and evaluation metrics are out of scope.
- DAVIO is represented by `runs/live_demo/map/active.ply`; intermediate q25/q50/q75 snapshots are out of scope.
- No new runtime dependency should be required for the viewer.

## Evidence on Hand

- `/home/jngu/workspace/sparo/GTSAM_VSLAM_LAB/outputs/MH_01_easy/dense_metric_map.ply`
- `/home/jngu/workspace/sparo/FoundationVIO/results/MH_01_easy/2026-10-21_18-05-15/.viz_cache/slam_clouds_downsampled_voxel0.01.npz` (loop closure disabled)
- `/home/jngu/workspace/sparo/FoundationVIO/results/MH_01_easy/2026-10-21_18-08-49/.viz_cache/slam_clouds_downsampled_voxel0.01.npz` (loop closure enabled)
- `/home/jngu/workspace/sparo/DAVIO_workspace/runs/live_demo/map/active.ply`

## Product Principles

- Put the reconstruction itself first; interface chrome stays quiet.
- Make side-by-side visual comparison immediate.
- Preserve source identity and experimental differences without inventing performance claims.
- Keep the static site self-contained and reproducible from the source outputs.
