#!/usr/bin/env python3
"""Export the four ff-dense-map sources as compact, browser-ready binary PLY files."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "static" / "ff-dense-map"
MAX_POINTS = 180_000

SOURCES = [
    {
        "id": "sqrt-vins",
        "name": "SQRT-VINS",
        "variant": "FF dense metric map",
        "kind": "ply",
        "path": Path(
            "/home/jngu/workspace/sparo/GTSAM_VSLAM_LAB/outputs/MH_01_easy/"
            "dense_metric_map.ply"
        ),
        "accent": "#f6c453",
    },
    {
        "id": "foundation-no-loop",
        "name": "FoundationVIO",
        "variant": "Loop closure off · 18:05:15",
        "kind": "npz",
        "path": Path(
            "/home/jngu/workspace/sparo/FoundationVIO/results/MH_01_easy/"
            "2026-10-21_18-05-15/.viz_cache/"
            "slam_clouds_downsampled_voxel0.01.npz"
        ),
        "accent": "#7dd3fc",
    },
    {
        "id": "foundation-loop",
        "name": "FoundationVIO",
        "variant": "Loop closure on · 18:08:49",
        "kind": "npz",
        "path": Path(
            "/home/jngu/workspace/sparo/FoundationVIO/results/MH_01_easy/"
            "2026-10-21_18-08-49/.viz_cache/"
            "slam_clouds_downsampled_voxel0.01.npz"
        ),
        "accent": "#a7f3d0",
    },
    {
        "id": "davio",
        "name": "DAVIO",
        "variant": "Final active map",
        "kind": "ply",
        "path": Path(
            "/home/jngu/workspace/sparo/DAVIO_workspace/runs/live_demo/map/active.ply"
        ),
        "accent": "#f0abfc",
    },
]


def read_binary_ply(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with path.open("rb") as stream:
        header_lines: list[str] = []
        while True:
            raw = stream.readline()
            if not raw:
                raise ValueError(f"{path}: missing PLY end_header")
            line = raw.decode("ascii").strip()
            header_lines.append(line)
            if line == "end_header":
                break

        if "format binary_little_endian 1.0" not in header_lines:
            raise ValueError(f"{path}: only binary little-endian PLY is supported")

        count_line = next(line for line in header_lines if line.startswith("element vertex "))
        count = int(count_line.split()[-1])
        vertex_dtype = np.dtype(
            [
                ("x", "<f4"),
                ("y", "<f4"),
                ("z", "<f4"),
                ("red", "u1"),
                ("green", "u1"),
                ("blue", "u1"),
            ]
        )
        vertices = np.fromfile(stream, dtype=vertex_dtype, count=count)

    points = np.column_stack((vertices["x"], vertices["y"], vertices["z"]))
    colors = np.column_stack((vertices["red"], vertices["green"], vertices["blue"]))
    return points, colors


def read_npz(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with np.load(path) as archive:
        return archive["points"], archive["colors"]


def sample_points(
    points: np.ndarray, colors: np.ndarray, seed: int
) -> tuple[np.ndarray, np.ndarray]:
    valid = np.isfinite(points).all(axis=1)
    points = np.asarray(points[valid], dtype=np.float32)
    colors = np.asarray(colors[valid], dtype=np.uint8)

    if len(points) <= MAX_POINTS:
        return points, colors

    rng = np.random.default_rng(seed)
    indices = np.sort(rng.choice(len(points), size=MAX_POINTS, replace=False))
    return points[indices], colors[indices]


def write_binary_ply(path: Path, points: np.ndarray, colors: np.ndarray) -> None:
    header = (
        "ply\n"
        "format binary_little_endian 1.0\n"
        f"element vertex {len(points)}\n"
        "property float x\n"
        "property float y\n"
        "property float z\n"
        "property uchar red\n"
        "property uchar green\n"
        "property uchar blue\n"
        "end_header\n"
    ).encode("ascii")

    packed = np.empty(
        len(points),
        dtype=np.dtype(
            [
                ("x", "<f4"),
                ("y", "<f4"),
                ("z", "<f4"),
                ("red", "u1"),
                ("green", "u1"),
                ("blue", "u1"),
            ]
        ),
    )
    packed["x"], packed["y"], packed["z"] = points.T
    packed["red"], packed["green"], packed["blue"] = colors.T

    with path.open("wb") as stream:
        stream.write(header)
        packed.tofile(stream)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    for seed, source in enumerate(SOURCES, start=1):
        source_path = source["path"]
        assert isinstance(source_path, Path)
        if not source_path.exists():
            raise FileNotFoundError(source_path)

        if source["kind"] == "ply":
            points, colors = read_binary_ply(source_path)
        else:
            points, colors = read_npz(source_path)

        source_count = len(points)
        points, colors = sample_points(points, colors, seed)
        output_name = f"{source['id']}.ply"
        write_binary_ply(OUTPUT / output_name, points, colors)

        minimum = points.min(axis=0)
        maximum = points.max(axis=0)
        extent = maximum - minimum
        manifest.append(
            {
                "id": source["id"],
                "name": source["name"],
                "variant": source["variant"],
                "file": output_name,
                "accent": source["accent"],
                "points": len(points),
                "sourcePoints": source_count,
                "extentMeters": [round(float(value), 2) for value in extent],
            }
        )
        print(f"{source['id']}: {source_count:,} -> {len(points):,} points")

    (OUTPUT / "manifest.json").write_text(
        json.dumps({"sequence": "EuRoC MH_01_easy", "maps": manifest}, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
