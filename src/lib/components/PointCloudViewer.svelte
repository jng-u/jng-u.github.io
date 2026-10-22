<script lang="ts">
	import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface CameraView {
		yaw: number;
		pitch: number;
		zoom: number;
		panX: number;
		panY: number;
	}

	export let source: string;
	export let name: string;
	export let variant: string;
	export let accent: string;
	export let pointCount: number;
	export let linkedView: CameraView | null = null;
	export let onViewChange: (view: CameraView) => void = () => undefined;

	let canvas: HTMLCanvasElement;
	let shell: HTMLElement;
	let status: 'loading' | 'ready' | 'error' = 'loading';
	let errorMessage = '';
	let renderer: PointCloudRenderer | null = null;
	let yaw = linkedView?.yaw ?? -0.62;
	let pitch = linkedView?.pitch ?? -0.42;
	let zoom = linkedView?.zoom ?? 1;
	let panX = linkedView?.panX ?? 0;
	let panY = linkedView?.panY ?? 0;
	let dragMode: 'orbit' | 'pan' | null = null;
	let pointerX = 0;
	let pointerY = 0;

	$: if (linkedView) {
		yaw = linkedView.yaw;
		pitch = linkedView.pitch;
		zoom = linkedView.zoom;
		panX = linkedView.panX;
		panY = linkedView.panY;
		renderer?.draw(yaw, pitch, zoom, panX, panY);
	}

	class PointCloudRenderer {
		private readonly target: HTMLCanvasElement;
		private readonly gl: WebGLRenderingContext;
		private readonly program: WebGLProgram;
		private readonly pointSize: WebGLUniformLocation;
		private readonly rotation: WebGLUniformLocation;
		private readonly zoom: WebGLUniformLocation;
		private readonly pan: WebGLUniformLocation;
		private readonly aspect: WebGLUniformLocation;
		private readonly resizeObserver: ResizeObserver;
		private vertexCount = 0;

		constructor(target: HTMLCanvasElement) {
			this.target = target;
			const gl = target.getContext('webgl', {
				alpha: true,
				antialias: true,
				powerPreference: 'high-performance'
			});
			if (!gl) throw new Error('WebGL is not available in this browser.');
			this.gl = gl;
			this.program = this.createProgram();
			this.pointSize = this.requireUniform('uPointSize');
			this.rotation = this.requireUniform('uRotation');
			this.zoom = this.requireUniform('uZoom');
			this.pan = this.requireUniform('uPan');
			this.aspect = this.requireUniform('uAspect');

			gl.useProgram(this.program);
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.clearColor(0, 0, 0, 0);

			this.resizeObserver = new ResizeObserver(() => this.resize());
			this.resizeObserver.observe(target);
			this.resize();
		}

		setCloud(buffer: ArrayBuffer) {
			const { positions, colors, count } = parsePly(buffer);
			const gl = this.gl;
			this.vertexCount = count;

			const positionBuffer = gl.createBuffer();
			if (!positionBuffer) throw new Error('Unable to allocate the point position buffer.');
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
			const positionLocation = gl.getAttribLocation(this.program, 'aPosition');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

			const colorBuffer = gl.createBuffer();
			if (!colorBuffer) throw new Error('Unable to allocate the point color buffer.');
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
			const colorLocation = gl.getAttribLocation(this.program, 'aColor');
			gl.enableVertexAttribArray(colorLocation);
			gl.vertexAttribPointer(colorLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
		}

		draw(viewYaw: number, viewPitch: number, viewZoom: number, viewPanX: number, viewPanY: number) {
			if (!this.vertexCount) return;
			const gl = this.gl;
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.uniform1f(this.pointSize, Math.min(window.devicePixelRatio || 1, 1.75) * 1.35);
			gl.uniform2f(this.rotation, viewYaw, viewPitch);
			gl.uniform1f(this.zoom, viewZoom);
			gl.uniform2f(this.pan, viewPanX, viewPanY);
			gl.uniform1f(this.aspect, this.target.width / this.target.height);
			gl.drawArrays(gl.POINTS, 0, this.vertexCount);
		}

		destroy() {
			this.resizeObserver.disconnect();
		}

		private resize() {
			const bounds = this.target.getBoundingClientRect();
			const density = Math.min(window.devicePixelRatio || 1, 1.75);
			const width = Math.max(1, Math.round(bounds.width * density));
			const height = Math.max(1, Math.round(bounds.height * density));
			if (this.target.width === width && this.target.height === height) return;
			this.target.width = width;
			this.target.height = height;
			this.gl.viewport(0, 0, width, height);
			this.draw(yaw, pitch, zoom, panX, panY);
		}

		private createProgram() {
			const vertexShader = this.compileShader(
				this.gl.VERTEX_SHADER,
				`attribute vec3 aPosition;
				attribute vec3 aColor;
				uniform vec2 uRotation;
				uniform float uZoom;
				uniform vec2 uPan;
				uniform float uAspect;
				uniform float uPointSize;
				varying vec3 vColor;

				void main() {
					float cy = cos(uRotation.x);
					float sy = sin(uRotation.x);
					float cx = cos(uRotation.y);
					float sx = sin(uRotation.y);
					vec3 p = vec3(
						cy * aPosition.x + sy * aPosition.z,
						aPosition.y,
						-sy * aPosition.x + cy * aPosition.z
					);
					p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
					p.xy += uPan;

					float cameraZ = 2.75 / uZoom;
					float viewZ = p.z - cameraZ;
					float f = 2.05;
					float near = 0.1;
					float far = 100.0;
					gl_Position = vec4(
						p.x * f / uAspect,
						p.y * f,
						((far + near) / (near - far)) * viewZ + (2.0 * far * near) / (near - far),
						-viewZ
					);
					gl_PointSize = uPointSize * clamp(2.7 / -viewZ, 0.72, 2.2);
					vColor = mix(aColor, vec3(1.0), 0.06);
				}`
			);
			const fragmentShader = this.compileShader(
				this.gl.FRAGMENT_SHADER,
				`precision mediump float;
				varying vec3 vColor;

				void main() {
					vec2 delta = gl_PointCoord - vec2(0.5);
					if (dot(delta, delta) > 0.25) discard;
					gl_FragColor = vec4(vColor, 0.94);
				}`
			);
			const program = this.gl.createProgram();
			if (!program) throw new Error('Unable to create the WebGL program.');
			this.gl.attachShader(program, vertexShader);
			this.gl.attachShader(program, fragmentShader);
			this.gl.linkProgram(program);
			if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
				throw new Error(this.gl.getProgramInfoLog(program) || 'Unable to link the WebGL program.');
			}
			return program;
		}

		private compileShader(type: number, sourceCode: string) {
			const shader = this.gl.createShader(type);
			if (!shader) throw new Error('Unable to create a WebGL shader.');
			this.gl.shaderSource(shader, sourceCode);
			this.gl.compileShader(shader);
			if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
				throw new Error(this.gl.getShaderInfoLog(shader) || 'Unable to compile a WebGL shader.');
			}
			return shader;
		}

		private requireUniform(name: string) {
			const location = this.gl.getUniformLocation(this.program, name);
			if (!location) throw new Error(`Missing WebGL uniform: ${name}`);
			return location;
		}
	}

	function parsePly(buffer: ArrayBuffer) {
		const prefix = new TextDecoder('ascii').decode(
			buffer.slice(0, Math.min(buffer.byteLength, 4096))
		);
		const endHeader = /end_header\r?\n/.exec(prefix);
		const countMatch = /element vertex (\d+)/.exec(prefix);
		if (!endHeader || endHeader.index === undefined || !countMatch) {
			throw new Error('The map file has an invalid PLY header.');
		}

		const count = Number(countMatch[1]);
		const dataOffset = endHeader.index + endHeader[0].length;
		const stride = 15;
		if (dataOffset + count * stride > buffer.byteLength) {
			throw new Error('The map file ended before all PLY vertices were read.');
		}

		const data = new DataView(buffer, dataOffset);
		const positions = new Float32Array(count * 3);
		const colors = new Uint8Array(count * 3);
		const minimum = [Infinity, Infinity, Infinity];
		const maximum = [-Infinity, -Infinity, -Infinity];

		for (let index = 0; index < count; index += 1) {
			const offset = index * stride;
			for (let axis = 0; axis < 3; axis += 1) {
				const value = data.getFloat32(offset + axis * 4, true);
				positions[index * 3 + axis] = value;
				minimum[axis] = Math.min(minimum[axis], value);
				maximum[axis] = Math.max(maximum[axis], value);
				colors[index * 3 + axis] = data.getUint8(offset + 12 + axis);
			}
		}

		const center = minimum.map((value, axis) => (value + maximum[axis]) / 2);
		const largestExtent = Math.max(...minimum.map((value, axis) => maximum[axis] - value));
		const scale = largestExtent > 0 ? 2.05 / largestExtent : 1;
		for (let index = 0; index < count; index += 1) {
			for (let axis = 0; axis < 3; axis += 1) {
				positions[index * 3 + axis] = (positions[index * 3 + axis] - center[axis]) * scale;
			}
		}

		return { positions, colors, count };
	}

	function publishView() {
		renderer?.draw(yaw, pitch, zoom, panX, panY);
		onViewChange({ yaw, pitch, zoom, panX, panY });
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0 && event.button !== 2) return;
		event.preventDefault();
		dragMode = event.button === 2 ? 'pan' : 'orbit';
		pointerX = event.clientX;
		pointerY = event.clientY;
		canvas.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragMode) return;
		const deltaX = event.clientX - pointerX;
		const deltaY = event.clientY - pointerY;
		if (dragMode === 'pan') {
			const panScale = 1.7 / zoom;
			panX = Math.max(-2, Math.min(2, panX + (deltaX / canvas.clientWidth) * panScale));
			panY = Math.max(-2, Math.min(2, panY - (deltaY / canvas.clientHeight) * panScale));
		} else {
			yaw += deltaX * 0.008;
			pitch = Math.max(-1.45, Math.min(1.45, pitch + deltaY * 0.006));
		}
		pointerX = event.clientX;
		pointerY = event.clientY;
		publishView();
	}

	function handlePointerUp(event: PointerEvent) {
		dragMode = null;
		if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		zoom = Math.max(0.58, Math.min(3.4, zoom * Math.exp(-event.deltaY * 0.0012)));
		publishView();
	}

	function handleKeydown(event: KeyboardEvent) {
		const turn = 0.08;
		const panStep = 0.08 / zoom;
		if (event.shiftKey && event.key === 'ArrowLeft') panX -= panStep;
		else if (event.shiftKey && event.key === 'ArrowRight') panX += panStep;
		else if (event.shiftKey && event.key === 'ArrowUp') panY += panStep;
		else if (event.shiftKey && event.key === 'ArrowDown') panY -= panStep;
		else if (event.key === 'ArrowLeft') yaw -= turn;
		else if (event.key === 'ArrowRight') yaw += turn;
		else if (event.key === 'ArrowUp') pitch = Math.max(-1.45, pitch - turn);
		else if (event.key === 'ArrowDown') pitch = Math.min(1.45, pitch + turn);
		else if (event.key === '+' || event.key === '=') zoom = Math.min(3.4, zoom * 1.12);
		else if (event.key === '-' || event.key === '_') zoom = Math.max(0.58, zoom / 1.12);
		else if (event.key === '0') resetView();
		else return;
		event.preventDefault();
		publishView();
	}

	function resetView() {
		yaw = -0.62;
		pitch = -0.42;
		zoom = 1;
		panX = 0;
		panY = 0;
		publishView();
	}

	function changeZoom(factor: number) {
		zoom = Math.max(0.58, Math.min(3.4, zoom * factor));
		publishView();
	}

	async function openFullscreen() {
		if (document.fullscreenElement === shell) await document.exitFullscreen();
		else await shell.requestFullscreen();
	}

	onMount(() => {
		let disposed = false;
		canvas.addEventListener('wheel', handleWheel, { passive: false });

		async function load() {
			try {
				renderer = new PointCloudRenderer(canvas);
				const response = await fetch(source);
				if (!response.ok) throw new Error(`Map download failed (${response.status}).`);
				const buffer = await response.arrayBuffer();
				if (disposed) return;
				renderer.setCloud(buffer);
				status = 'ready';
				renderer.draw(yaw, pitch, zoom, panX, panY);
			} catch (error) {
				console.error(`Failed to load point cloud: ${source}`, error);
				status = 'error';
				errorMessage = error instanceof Error ? error.message : 'The map could not be displayed.';
			}
		}

		load();
		return () => {
			disposed = true;
			canvas.removeEventListener('wheel', handleWheel);
			renderer?.destroy();
		};
	});
</script>

<section
	class="viewer"
	bind:this={shell}
	style={`--map-accent: ${accent}`}
	aria-labelledby={`${name}-${variant}`}
>
	<header>
		<div>
			<h2 id={`${name}-${variant}`}>{name}</h2>
			<p>{variant}</p>
		</div>
		<div class="actions">
			<button
				type="button"
				onclick={resetView}
				aria-label={`Reset ${name} view`}
				title="Reset view"
			>
				<RotateCcw size={16} strokeWidth={1.8} />
			</button>
			<button
				type="button"
				onclick={openFullscreen}
				aria-label={`Show ${name} in fullscreen`}
				title="Fullscreen"
			>
				<Maximize2 size={16} strokeWidth={1.8} />
			</button>
		</div>
	</header>

	<div class:dragging={dragMode !== null} class:panning={dragMode === 'pan'} class="viewport">
		<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
		<canvas
			bind:this={canvas}
			tabindex="0"
			role="application"
			aria-label={`${name}, ${variant}, interactive 3D point cloud`}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			oncontextmenu={(event) => event.preventDefault()}
			onkeydown={handleKeydown}
			ondblclick={resetView}
		></canvas>

		{#if status === 'loading'}
			<div class="state loading" aria-live="polite">
				<span></span>
				Loading point cloud
			</div>
		{:else if status === 'error'}
			<div class="state error" role="alert">
				<strong>Map unavailable</strong>
				<small>{errorMessage}</small>
			</div>
		{/if}

		<div class="zoom-controls">
			<button
				type="button"
				onclick={() => changeZoom(1 / 1.16)}
				aria-label={`Zoom out ${name} map`}
				title="Zoom out"
			>
				<ZoomOut size={16} strokeWidth={1.8} />
			</button>
			<button
				type="button"
				onclick={() => changeZoom(1.16)}
				aria-label={`Zoom in ${name} map`}
				title="Zoom in"
			>
				<ZoomIn size={16} strokeWidth={1.8} />
			</button>
		</div>

		<div class="interaction-hint" aria-hidden="true">
			<span class="pointer-hint">left drag: orbit · right drag: pan · scroll: zoom</span>
			<span class="touch-hint">drag to orbit · use − / + to zoom</span>
		</div>
	</div>

	<footer>
		<span>{pointCount.toLocaleString()} points</span>
		<span>WebGL</span>
	</footer>
</section>

<style>
	.viewer {
		position: relative;
		display: grid;
		grid-template-rows: auto minmax(280px, 1fr) auto;
		min-width: 0;
		min-height: 0;
		margin: 0;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		background: #0a0f14;
		box-shadow: 0 18px 42px -26px rgba(0, 0, 0, 0.8);
		color: #f4f7f8;
	}

	.viewer::before {
		position: absolute;
		inset: 0 auto auto 0;
		width: 100%;
		height: 2px;
		background: var(--map-accent);
		content: '';
		z-index: 2;
	}

	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-inline: 0.85rem;
	}

	header {
		box-sizing: border-box;
		height: 48px;
		min-height: 48px;
		padding-block: 5px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	h2,
	p {
		max-width: none;
		margin: 0;
	}

	h2 {
		color: #f7fafb;
		font-size: 14px;
		font-weight: 650;
		line-height: 16px;
		letter-spacing: -0.015em;
	}

	p {
		margin-top: 0.05rem;
		color: #aebbc3;
		font-size: 11px;
		line-height: 14px;
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: flex;
		gap: 0.35rem;
	}

	.zoom-controls {
		position: absolute;
		bottom: 0.55rem;
		left: 0.65rem;
		display: flex;
		gap: 0.35rem;
		z-index: 3;
	}

	.zoom-controls button {
		background: rgba(17, 25, 32, 0.88);
	}

	button {
		display: grid;
		width: 30px;
		height: 30px;
		min-width: 0;
		margin: 0;
		padding: 0;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 9px;
		background: #111920;
		box-shadow: none;
		color: #c8d2d8;
	}

	button:hover {
		border-color: color-mix(in srgb, var(--map-accent) 55%, transparent);
		background: #18222a;
		color: #fff;
	}

	button:focus-visible,
	canvas:focus-visible {
		outline: 2px solid var(--map-accent);
		outline-offset: -3px;
	}

	.viewport {
		position: relative;
		min-height: 280px;
		overflow: hidden;
		background-color: #070b0f;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
		background-size: 32px 32px;
		cursor: grab;
		touch-action: none;
	}

	.viewport::after {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 48%, transparent 45%, rgba(0, 0, 0, 0.34) 100%);
		content: '';
		pointer-events: none;
	}

	.viewport.dragging {
		cursor: grabbing;
	}

	.viewport.panning {
		cursor: move;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.state {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		background: rgba(7, 11, 15, 0.88);
		color: #c7d0d6;
		font-size: 0.76rem;
		letter-spacing: 0.02em;
		z-index: 3;
	}

	.loading span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--map-accent);
		animation: pulse 1.2s ease-in-out infinite;
	}

	.error {
		flex-direction: column;
		text-align: center;
	}

	.error strong {
		color: #fecaca;
	}

	.error small {
		max-width: 38ch;
		color: #d0b7b7;
	}

	.interaction-hint {
		position: absolute;
		right: 0.75rem;
		bottom: 0.65rem;
		padding: 0.28rem 0.5rem;
		border-radius: 7px;
		background: rgba(5, 8, 11, 0.72);
		color: #91a0a9;
		font-size: 0.62rem;
		letter-spacing: 0.02em;
		pointer-events: none;
		z-index: 2;
	}

	.touch-hint {
		display: none;
	}

	footer {
		min-height: 30px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		color: #829099;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.015em;
	}

	.viewer:fullscreen {
		width: 100vw;
		height: 100vh;
		border: 0;
		border-radius: 0;
	}

	.viewer:fullscreen .viewport {
		min-height: 0;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.35;
			transform: scale(0.8);
		}
		50% {
			opacity: 1;
			transform: scale(1.25);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loading span {
			animation: none;
		}
	}

	@media (pointer: coarse) {
		button {
			width: 44px;
			height: 44px;
		}

		.pointer-hint {
			display: none;
		}

		.touch-hint {
			display: inline;
		}
	}
</style>
