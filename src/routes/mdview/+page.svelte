<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { FileText, FolderOpen, ShieldCheck, Upload, X } from 'lucide-svelte';
	import * as config from '$lib/config';
	import { isMarkdownPath, renderMarkdown, type ViewerFile } from '$lib/mdview';

	const MAX_MARKDOWN_SIZE = 4 * 1024 * 1024;
	const MIN_FONT_SCALE = 40;
	const MAX_FONT_SCALE = 200;
	const FONT_SCALE_STEP = 5;
	const MIN_READING_WIDTH = 32;
	const MAX_READING_WIDTH = 200;

	type FolderFile = { file: File; path: string };

	let input: HTMLInputElement;
	let viewerElement: HTMLElement;
	let files = $state<ViewerFile[]>([]);
	let filesByPath = $state<Map<string, File>>(new Map());
	let selectedPath = $state('');
	let query = $state('');
	let folderName = $state('');
	let rendered = $state('');
	let loading = $state(false);
	let error = $state('');
	let dropActive = $state(false);
	let fontScale = $state(100);
	let readingWidth = $state(72);
	let sidebarWidth = $state(268);
	let resizingSidebar = $state(false);
	let imageUrls = new Map<string, string>();
	let renderVersion = 0;
	let dragDepth = 0;

	let filteredFiles = $derived.by(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return files;
		return files.filter((entry) => entry.searchText.includes(normalizedQuery));
	});
	let selectedFile = $derived(files.find((entry) => entry.path === selectedPath));

	async function loadFolder(fileList: FileList | null) {
		if (!fileList?.length) return;
		await loadFiles(Array.from(fileList, (file) => ({ file, path: relativePath(file) })));
	}

	async function loadFiles(droppedFiles: FolderFile[]) {
		if (!droppedFiles.length) return;
		resetObjectUrls();
		error = '';
		query = '';

		const root = commonRoot(droppedFiles) ?? '드롭한 파일';
		const nextFilesByPath = new Map<string, File>();
		for (const entry of droppedFiles) {
			nextFilesByPath.set(withoutRoot(entry.path, root), entry.file);
		}

		const markdownFiles = droppedFiles
			.filter((entry) => isMarkdownPath(entry.file.name))
			.map((entry) => {
				const path = withoutRoot(entry.path, root);
				return {
					file: entry.file,
					name: entry.file.name,
					path,
					searchText: path.toLocaleLowerCase()
				};
			})
			.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

		filesByPath = nextFilesByPath;
		files = markdownFiles;
		folderName = root;
		selectedPath = preferredFile(markdownFiles)?.path ?? '';

		if (!markdownFiles.length) {
			rendered = '';
			error = '선택한 폴더에서 Markdown 파일을 찾지 못했습니다.';
			return;
		}
		await openFile(selectedPath);
	}

	function hasDraggedFiles(event: DragEvent): boolean {
		return event.dataTransfer?.types.includes('Files') ?? false;
	}

	function handleDragEnter(event: DragEvent) {
		if (!hasDraggedFiles(event)) return;
		event.preventDefault();
		dragDepth += 1;
		dropActive = true;
	}

	function handleDragOver(event: DragEvent) {
		if (!hasDraggedFiles(event)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function handleDragLeave() {
		if (!dropActive) return;
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) dropActive = false;
	}

	async function handleDrop(event: DragEvent) {
		if (!hasDraggedFiles(event) || !event.dataTransfer) return;
		event.preventDefault();
		dragDepth = 0;
		dropActive = false;
		try {
			const droppedFiles = await filesFromDrop(event.dataTransfer);
			await loadFiles(droppedFiles);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : '드롭한 폴더를 읽지 못했습니다.';
		}
	}

	async function filesFromDrop(dataTransfer: DataTransfer): Promise<FolderFile[]> {
		const entries = Array.from(dataTransfer.items)
			.map((item) => item.webkitGetAsEntry?.() ?? null)
			.filter((entry): entry is FileSystemEntry => entry !== null);

		if (entries.length) {
			const nested = await Promise.all(entries.map((entry) => readDroppedEntry(entry)));
			return nested.flat();
		}

		return Array.from(dataTransfer.files, (file) => ({ file, path: relativePath(file) }));
	}

	async function readDroppedEntry(entry: FileSystemEntry, parentPath = ''): Promise<FolderFile[]> {
		const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
		if (entry.isFile) {
			const fileEntry = entry as FileSystemFileEntry;
			const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject));
			return [{ file, path }];
		}
		if (!entry.isDirectory) return [];

		const children = await readAllDirectoryEntries(
			(entry as FileSystemDirectoryEntry).createReader()
		);
		const nested = await Promise.all(children.map((child) => readDroppedEntry(child, path)));
		return nested.flat();
	}

	async function readAllDirectoryEntries(
		reader: FileSystemDirectoryReader
	): Promise<FileSystemEntry[]> {
		const allEntries: FileSystemEntry[] = [];
		while (true) {
			const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
				reader.readEntries(resolve, reject)
			);
			if (!batch.length) return allEntries;
			allEntries.push(...batch);
		}
	}

	async function openFile(path: string) {
		const entry = files.find((file) => file.path === path);
		if (!entry) return;
		selectedPath = path;
		error = '';
		rendered = '';
		const version = ++renderVersion;

		if (entry.file.size > MAX_MARKDOWN_SIZE) {
			error = `${entry.name}은(는) 4MB를 넘어 미리보기를 열 수 없습니다.`;
			return;
		}

		loading = true;
		try {
			const source = await entry.file.text();
			const html = await renderMarkdown(source, entry.path, filesByPath, imageUrls);
			if (version === renderVersion) rendered = html;
		} catch (cause) {
			if (version === renderVersion) {
				error = cause instanceof Error ? cause.message : 'Markdown을 렌더링하지 못했습니다.';
			}
		} finally {
			if (version === renderVersion) loading = false;
		}
	}

	function handleArticleClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest<HTMLAnchorElement>('a[data-md-path]');
		if (!link?.dataset.mdPath) return;
		event.preventDefault();
		void openFile(link.dataset.mdPath);
	}

	function clearFolder() {
		++renderVersion;
		resetObjectUrls();
		files = [];
		filesByPath = new Map();
		selectedPath = '';
		folderName = '';
		query = '';
		rendered = '';
		error = '';
		loading = false;
		dropActive = false;
		if (input) input.value = '';
	}

	function adjustFont(direction: -1 | 1) {
		setFontScale(fontScale + FONT_SCALE_STEP * direction);
	}

	function setFontScale(value: number) {
		if (!Number.isFinite(value)) return;
		fontScale = Math.round(Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, value)));
		localStorage.setItem('mdview.fontScale', String(fontScale));
	}

	function setReadingWidth(value: number) {
		readingWidth = Math.round(Math.max(MIN_READING_WIDTH, Math.min(MAX_READING_WIDTH, value)));
		localStorage.setItem('mdview.readingWidth', String(readingWidth));
	}

	function startSidebarResize(event: PointerEvent) {
		if (event.button !== 0) return;
		resizingSidebar = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		resizeSidebar(event.clientX);
	}

	function moveSidebarResize(event: PointerEvent) {
		if (resizingSidebar) resizeSidebar(event.clientX);
	}

	function stopSidebarResize(event: PointerEvent) {
		if (!resizingSidebar) return;
		resizingSidebar = false;
		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
		localStorage.setItem('mdview.sidebarWidth', String(sidebarWidth));
	}

	function resizeSidebar(clientX: number) {
		const bounds = viewerElement.getBoundingClientRect();
		const maximum = Math.min(480, bounds.width * 0.46);
		sidebarWidth = Math.round(Math.max(220, Math.min(maximum, clientX - bounds.left)));
	}

	function resizeSidebarWithKeyboard(event: KeyboardEvent) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		const direction = event.key === 'ArrowLeft' ? -1 : 1;
		const bounds = viewerElement.getBoundingClientRect();
		const maximum = Math.min(480, bounds.width * 0.46);
		sidebarWidth = Math.round(Math.max(220, Math.min(maximum, sidebarWidth + direction * 20)));
		localStorage.setItem('mdview.sidebarWidth', String(sidebarWidth));
	}

	function resetObjectUrls() {
		for (const url of imageUrls.values()) URL.revokeObjectURL(url);
		imageUrls = new Map();
	}

	function relativePath(file: File): string {
		return (file.webkitRelativePath || file.name).replaceAll('\\', '/');
	}

	function withoutRoot(path: string, root: string): string {
		return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
	}

	function commonRoot(entries: FolderFile[]): string | undefined {
		const first = entries[0]?.path.replaceAll('\\', '/').split('/');
		if (!first || first.length < 2) return undefined;
		const root = first[0];
		return entries.every((entry) => entry.path.replaceAll('\\', '/').startsWith(`${root}/`))
			? root
			: undefined;
	}

	function preferredFile(entries: ViewerFile[]): ViewerFile | undefined {
		return entries.find((entry) => /(^|\/)readme\.md$/i.test(entry.path)) ?? entries[0];
	}

	onMount(() => {
		const storedFontScale = Number(localStorage.getItem('mdview.fontScale'));
		const storedReadingWidth = Number(localStorage.getItem('mdview.readingWidth'));
		const storedSidebarWidth = localStorage.getItem('mdview.sidebarWidth');
		if (storedFontScale >= MIN_FONT_SCALE && storedFontScale <= MAX_FONT_SCALE) {
			fontScale = Math.round(storedFontScale);
		}
		if (storedReadingWidth >= MIN_READING_WIDTH && storedReadingWidth <= MAX_READING_WIDTH) {
			readingWidth = Math.round(storedReadingWidth);
		}
		if (storedSidebarWidth !== null && Number.isFinite(Number(storedSidebarWidth))) {
			sidebarWidth = Math.max(220, Math.min(480, Number(storedSidebarWidth)));
		}
	});

	onDestroy(resetObjectUrls);
</script>

<svelte:head>
	<title>Markdown Viewer · {config.title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:window
	onclick={handleArticleClick}
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={(event) => void handleDrop(event)}
/>

<input
	bind:this={input}
	class="folder-input"
	type="file"
	multiple
	webkitdirectory
	onchange={(event) => void loadFolder(event.currentTarget.files)}
/>

<section
	bind:this={viewerElement}
	class="md-viewer"
	class:resizing={resizingSidebar}
	aria-label="Markdown 폴더 뷰어"
	style:--sidebar-width={`${sidebarWidth}px`}
>
	{#if dropActive}
		<div class="drop-overlay" aria-live="polite">
			<Upload size={34} aria-hidden="true" />
			<strong>폴더를 여기에 놓으세요</strong>
			<span>Markdown 문서와 상대 경로 이미지를 함께 불러옵니다.</span>
		</div>
	{/if}
	{#if files.length === 0}
		<div class="empty-state">
			<div class="empty-icon" aria-hidden="true"><FolderOpen size={36} strokeWidth={1.5} /></div>
			<h1>Markdown 폴더를 바로 읽기</h1>
			<p>
				폴더 하나를 선택하거나 이 화면에 끌어놓으면 안의 Markdown 문서를 찾아 읽기 좋은 화면으로
				렌더링합니다.
			</p>
			<button type="button" onclick={() => input.click()}>
				<Upload size={18} aria-hidden="true" />
				폴더 열기
			</button>
			<div class="privacy-note">
				<ShieldCheck size={17} aria-hidden="true" />
				<span>파일은 이 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.</span>
			</div>
			{#if error}<p class="empty-error" role="alert">{error}</p>{/if}
		</div>
	{:else}
		<aside class="file-panel" aria-label="Markdown 파일 목록">
			<header>
				<div class="folder-title">
					<FolderOpen size={19} aria-hidden="true" />
					<div>
						<strong>{folderName}</strong>
						<small>{files.length.toLocaleString()}개 문서</small>
					</div>
				</div>
				<button
					class="icon-button"
					type="button"
					onclick={clearFolder}
					aria-label="폴더 닫기"
					title="폴더 닫기"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</header>

			<label class="search-field">
				<span class="sr-only">파일 경로 검색</span>
				<input bind:value={query} type="search" placeholder="파일 경로 검색" />
			</label>

			<nav class="file-list" aria-label={`${folderName}의 Markdown 문서`}>
				{#each filteredFiles as entry (entry.path)}
					<button
						type="button"
						class:active={entry.path === selectedPath}
						onclick={() => void openFile(entry.path)}
						aria-current={entry.path === selectedPath ? 'page' : undefined}
					>
						<FileText size={16} aria-hidden="true" />
						<span><strong>{entry.name}</strong><small>{entry.path}</small></span>
					</button>
				{/each}
				{#if filteredFiles.length === 0}<p>일치하는 문서가 없습니다.</p>{/if}
			</nav>

			<button class="change-folder" type="button" onclick={() => input.click()}>
				<FolderOpen size={16} aria-hidden="true" />
				다른 폴더 열기
			</button>
		</aside>

		<div
			class="panel-resizer"
			role="slider"
			aria-label="파일 목록 너비 조절"
			aria-orientation="horizontal"
			aria-valuemin="220"
			aria-valuemax="480"
			aria-valuenow={sidebarWidth}
			tabindex="0"
			onpointerdown={startSidebarResize}
			onpointermove={moveSidebarResize}
			onpointerup={stopSidebarResize}
			onpointercancel={stopSidebarResize}
			onkeydown={resizeSidebarWithKeyboard}
		></div>

		<section class="preview-panel" aria-label="Markdown 미리보기">
			<header class="preview-header">
				<div class="preview-title">
					<strong>{selectedFile?.name}</strong>
					<small>{selectedPath}</small>
				</div>
				<div class="viewer-controls">
					<div role="group" aria-label="글자 크기 조절">
						<span>글자</span>
						<button
							type="button"
							onclick={() => adjustFont(-1)}
							disabled={fontScale <= MIN_FONT_SCALE}
							aria-label="글자 크기 줄이기">−</button
						>
						<label class="font-value">
							<span class="sr-only">글자 크기 백분율</span>
							<input
								type="number"
								min={MIN_FONT_SCALE}
								max={MAX_FONT_SCALE}
								step="1"
								value={fontScale}
								onchange={(event) => setFontScale(event.currentTarget.valueAsNumber)}
								onblur={(event) => setFontScale(event.currentTarget.valueAsNumber)}
							/>
							<span aria-hidden="true">%</span>
						</label>
						<button
							type="button"
							onclick={() => adjustFont(1)}
							disabled={fontScale >= MAX_FONT_SCALE}
							aria-label="글자 크기 키우기">+</button
						>
					</div>
					<label class="reading-width-control">
						<span>본문 폭</span>
						<input
							type="range"
							min={MIN_READING_WIDTH}
							max={MAX_READING_WIDTH}
							step="2"
							value={readingWidth}
							oninput={(event) => setReadingWidth(event.currentTarget.valueAsNumber)}
							aria-label="본문 영역 너비"
						/>
						<output aria-live="polite">{readingWidth}ch</output>
					</label>
				</div>
			</header>

			{#if loading}
				<div class="viewer-status" aria-live="polite" aria-busy="true">
					문서를 렌더링하고 있습니다…
				</div>
			{:else if error}
				<div class="viewer-status error" role="alert">
					<strong>문서를 열지 못했습니다.</strong><span>{error}</span>
				</div>
			{:else}
				<article
					class="markdown-body"
					style:--reader-font-scale={fontScale / 100}
					style:--reader-width={`${readingWidth}ch`}
				>
					<div class="markdown-content">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- safe HTML allowlist is enforced in renderMarkdown -->
						{@html rendered}
					</div>
				</article>
			{/if}
		</section>
	{/if}
</section>

<style>
	:global(main:has(.md-viewer)) {
		position: relative;
		left: 50%;
		width: calc(100vw - 2rem);
		max-width: none;
		padding-top: var(--size-4);
		transform: translateX(-50%);
	}

	.folder-input,
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.md-viewer {
		position: relative;
		min-height: min(760px, calc(100dvh - 12rem));
		border: 1px solid var(--pico-muted-border-color);
		border-radius: var(--pico-border-radius);
		overflow: hidden;
		background: var(--pico-card-background-color);
	}

	.md-viewer.resizing {
		cursor: col-resize;
		user-select: none;
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 2rem;
		background: color-mix(in srgb, var(--pico-background-color) 92%, transparent);
		color: var(--pico-primary);
		text-align: center;
		backdrop-filter: blur(6px);
	}

	.drop-overlay::after {
		position: absolute;
		inset: 1rem;
		border: 2px dashed var(--pico-primary-border);
		border-radius: var(--pico-border-radius);
		content: '';
		pointer-events: none;
	}

	.drop-overlay strong {
		font-size: 1.2rem;
	}

	.drop-overlay span {
		color: var(--pico-muted-color);
		font-size: 0.85rem;
	}

	.empty-state {
		min-height: min(680px, calc(100dvh - 12rem));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: clamp(2rem, 8vw, 6rem) 1.5rem;
		text-align: center;
	}

	.empty-icon {
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		margin-bottom: 1.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
	}

	.empty-state h1 {
		max-width: 15ch;
		margin-bottom: 0.75rem;
		font-size: clamp(1.8rem, 5vw, 3rem);
		letter-spacing: -0.03em;
		text-wrap: balance;
	}

	.empty-state > p {
		max-width: 50ch;
		margin-bottom: 1.5rem;
		color: var(--pico-muted-color);
		line-height: 1.7;
	}

	.empty-state > button,
	.change-folder {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
	}

	.privacy-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 31rem;
		margin-top: 1.25rem;
		color: var(--pico-muted-color);
		font-size: 0.8rem;
	}

	.empty-error {
		margin-top: 1rem;
		color: var(--pico-del-color) !important;
	}

	.md-viewer:has(.file-panel) {
		display: grid;
		grid-template-columns: var(--sidebar-width) 7px minmax(0, 1fr);
	}

	.file-panel,
	.preview-panel {
		min-width: 0;
		min-height: 0;
	}

	.file-panel {
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--pico-card-background-color) 92%, var(--pico-primary) 8%);
	}

	.panel-resizer {
		position: relative;
		z-index: 2;
		width: 7px;
		min-width: 7px;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		cursor: col-resize;
		background: var(--pico-muted-border-color);
		box-shadow: none;
		touch-action: none;
	}

	.panel-resizer::after {
		position: absolute;
		inset: 0 -3px;
		content: '';
	}

	.panel-resizer:hover,
	.panel-resizer:focus-visible,
	.md-viewer.resizing .panel-resizer {
		background: var(--pico-primary);
	}

	.file-panel > header,
	.preview-header {
		min-height: 4.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.folder-title {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.folder-title > div,
	.preview-title {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.folder-title strong,
	.folder-title small,
	.preview-header strong,
	.preview-header small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.folder-title small,
	.preview-header small {
		color: var(--pico-muted-color);
		font-size: 0.72rem;
	}

	.icon-button {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--pico-muted-color);
		box-shadow: none;
	}

	.icon-button:hover {
		background: var(--pico-secondary-hover-background);
		color: var(--pico-contrast);
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.85rem 0.85rem 0.35rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--pico-form-element-border-color);
		border-radius: var(--pico-border-radius);
		background: var(--pico-form-element-background-color);
		color: var(--pico-muted-color);
	}

	.search-field:focus-within {
		border-color: var(--pico-form-element-active-border-color);
		box-shadow: 0 0 0 var(--pico-outline-width) var(--pico-form-element-focus-color);
	}

	.search-field input {
		min-width: 0;
		margin: 0;
		padding: 0.6rem 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		font-size: 0.85rem;
	}

	.file-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-start;
		gap: 0.2rem;
		padding: 0.5rem 0.65rem 1rem;
	}

	.file-list button {
		width: 100%;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		padding: 0.65rem 0.7rem;
		border: 0;
		border-radius: calc(var(--pico-border-radius) * 0.75);
		background: transparent;
		color: var(--pico-contrast);
		box-shadow: none;
		text-align: left;
	}

	.file-list button:hover {
		background: var(--pico-secondary-hover-background);
	}

	.file-list button.active {
		background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
		color: var(--pico-primary);
	}

	.file-list button > span {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.file-list strong,
	.file-list small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-list strong {
		font-size: 0.82rem;
	}

	.file-list small {
		color: var(--pico-muted-color);
		font-size: 0.67rem;
	}

	.file-list p {
		padding: 1rem 0.5rem;
		color: var(--pico-muted-color);
		font-size: 0.8rem;
		text-align: center;
	}

	.change-folder {
		margin: 0.75rem;
		padding: 0.55rem 0.75rem;
		font-size: 0.78rem;
	}

	.preview-panel {
		display: flex;
		flex-direction: column;
		background: var(--pico-background-color);
	}

	.preview-title {
		flex: 1;
	}

	.viewer-controls {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.viewer-controls > div,
	.reading-width-control {
		width: auto;
		flex: none;
		display: flex;
		align-items: center;
		margin: 0;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: calc(var(--pico-border-radius) * 0.75);
		overflow: hidden;
	}

	.viewer-controls > div > span,
	.reading-width-control > span,
	.reading-width-control output {
		color: var(--pico-muted-color);
		font-size: 0.68rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
		padding-inline: 0.5rem 0.15rem;
		white-space: nowrap;
	}

	.font-value {
		width: auto;
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.15rem;
		margin: 0;
		padding-inline: 0.25rem;
		border-inline: 1px solid var(--pico-muted-border-color);
		color: var(--pico-muted-color);
	}

	.viewer-controls .font-value input[type='number'] {
		flex: none;
		width: 3rem;
		max-width: 3rem;
		height: 1.75rem;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		color: var(--pico-color);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.font-value > span:last-child {
		font-size: 0.68rem;
	}

	.reading-width-control {
		width: auto;
		gap: 0.45rem;
		padding-inline: 0.35rem 0.55rem;
	}

	.reading-width-control input[type='range'] {
		width: clamp(7rem, 9vw, 10rem);
		height: 1.85rem;
		margin: 0;
		padding: 0;
		accent-color: var(--pico-primary);
		cursor: ew-resize;
	}

	.reading-width-control output {
		min-width: 3.5rem;
		padding-inline: 0;
	}

	.viewer-controls button {
		width: 1.85rem;
		height: 1.85rem;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		color: var(--pico-contrast);
		box-shadow: none;
		font-size: 0.9rem;
	}

	.viewer-controls button:hover:not(:disabled) {
		background: var(--pico-secondary-hover-background);
	}

	.viewer-controls button:disabled {
		opacity: 0.35;
	}

	.viewer-status {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		color: var(--pico-muted-color);
		text-align: center;
	}

	.viewer-status.error {
		flex-direction: column;
		gap: 0.4rem;
	}

	.viewer-status.error strong {
		color: var(--pico-del-color);
	}

	.markdown-body {
		flex: 1;
		overflow-y: auto;
		width: 100%;
		margin: 0;
		padding: clamp(1.5rem, 5vw, 4rem) clamp(1.25rem, 6vw, 5rem) 5rem;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}

	.markdown-content {
		width: min(100%, var(--reader-width));
		margin-inline: auto;
		font-size: calc(0.95rem * var(--reader-font-scale));
	}

	.markdown-content :global(> :first-child) {
		margin-top: 0;
	}

	.markdown-content :global(> :last-child) {
		margin-bottom: 0;
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3),
	.markdown-body :global(h4),
	.markdown-body :global(h5),
	.markdown-body :global(h6),
	.markdown-body :global(p),
	.markdown-body :global(ul),
	.markdown-body :global(ol),
	.markdown-body :global(dl),
	.markdown-body :global(li),
	.markdown-body :global(blockquote),
	.markdown-body :global(pre),
	.markdown-body :global(figure),
	.markdown-body :global(details) {
		max-inline-size: none;
	}

	.markdown-body :global(h1) {
		margin: 0 0 1.5rem;
		padding-bottom: 0.65rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		font-size: 2.45em;
		line-height: 1.15;
		letter-spacing: -0.03em;
	}

	.markdown-body :global(h2) {
		margin: 2.75rem 0 1rem;
		padding-bottom: 0.45rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		font-size: 1.65em;
		line-height: 1.25;
	}

	.markdown-body :global(h3) {
		margin: 2.25rem 0 0.8rem;
		font-size: 1.3em;
		line-height: 1.3;
	}

	.markdown-body :global(h4),
	.markdown-body :global(h5),
	.markdown-body :global(h6) {
		margin: 1.75rem 0 0.65rem;
		line-height: 1.35;
	}

	.markdown-body :global(h4) {
		font-size: 1.15em;
	}

	.markdown-body :global(h5) {
		font-size: 1em;
	}

	.markdown-body :global(h6) {
		font-size: 0.9em;
	}

	.markdown-body :global(p),
	.markdown-body :global(ul),
	.markdown-body :global(ol),
	.markdown-body :global(dl),
	.markdown-body :global(li),
	.markdown-body :global(dt),
	.markdown-body :global(dd),
	.markdown-body :global(td),
	.markdown-body :global(th) {
		font-size: inherit;
		line-height: 1.75;
	}

	.markdown-body :global(small),
	.markdown-body :global(figcaption) {
		font-size: 0.8em;
	}

	.markdown-body :global(p),
	.markdown-body :global(ul),
	.markdown-body :global(ol),
	.markdown-body :global(dl) {
		margin-top: 0;
		margin-bottom: 1.25rem;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-inline-start: 1.5rem;
	}

	.markdown-body :global(li) {
		margin-bottom: 0.3rem;
	}

	.markdown-body :global(li:last-child) {
		margin-bottom: 0;
	}

	.markdown-body :global(pre) {
		overflow-x: auto;
		width: 100%;
		margin: 1.5rem 0;
		padding: 1rem;
		border-radius: var(--pico-border-radius);
		background: var(--pico-code-background-color);
	}

	.markdown-body :global(code) {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.86em;
	}

	.markdown-body :global(pre code) {
		padding: 0;
		background: transparent;
		white-space: pre;
	}

	.markdown-body :global(blockquote) {
		margin: 1.5rem 0;
		border-left-width: 1px;
	}

	.markdown-body :global(table) {
		display: block;
		width: max-content;
		max-width: 100%;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	.markdown-body :global(img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1.5rem auto;
		border-radius: var(--pico-border-radius);
	}

	.markdown-body :global(.contains-task-list) {
		padding-left: 0;
		list-style: none;
	}

	.markdown-body :global(.task-list-item input) {
		margin-right: 0.5rem;
	}

	.markdown-body :global(.math-display) {
		overflow-x: auto;
		margin: 1.5rem 0;
		padding-block: 0.25rem;
		text-align: center;
	}

	.markdown-body :global(hr) {
		margin: 2rem 0;
	}

	.markdown-body :global(a) {
		text-underline-offset: 0.18em;
	}

	.markdown-body :global(a[data-md-path])::after {
		content: ' →';
		font-size: 0.8em;
	}

	.file-list::-webkit-scrollbar,
	.markdown-body::-webkit-scrollbar {
		width: 10px;
		height: 10px;
	}

	.file-list::-webkit-scrollbar-thumb,
	.markdown-body::-webkit-scrollbar-thumb {
		border: 3px solid transparent;
		border-radius: 999px;
		background: var(--pico-muted-border-color);
		background-clip: padding-box;
	}

	@media (max-width: 760px) {
		:global(main:has(.md-viewer)) {
			width: calc(100vw - 1rem);
		}

		.md-viewer {
			min-height: calc(100dvh - 9rem);
		}

		.md-viewer:has(.file-panel) {
			display: flex;
			flex-direction: column;
		}

		.panel-resizer {
			display: none;
		}

		.file-panel {
			flex: 0 0 auto;
			max-height: 18rem;
			border-right: 0;
			border-bottom: 1px solid var(--pico-muted-border-color);
		}

		.file-panel > header,
		.preview-header {
			min-height: 3.75rem;
		}

		.preview-header {
			align-items: flex-start;
			flex-wrap: wrap;
		}

		.preview-title {
			width: 100%;
			flex-basis: 100%;
		}

		.viewer-controls {
			width: 100%;
			flex-wrap: wrap;
			justify-content: space-between;
		}

		.reading-width-control {
			width: 100%;
			flex: 1 0 100%;
		}

		.reading-width-control input[type='range'] {
			width: auto;
			flex: 1;
		}

		.file-list {
			max-height: 9rem;
		}

		.change-folder {
			display: none;
		}

		.preview-panel {
			flex: 1;
		}

		.markdown-body {
			padding: 1.5rem 1rem 4rem;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.empty-icon {
			animation: folder-arrive 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
		}

		@keyframes folder-arrive {
			from {
				transform: translateY(8px);
				opacity: 0.3;
				filter: blur(3px);
			}
			to {
				transform: translateY(0);
				opacity: 1;
				filter: blur(0);
			}
		}
	}
</style>
