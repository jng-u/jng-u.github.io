<script lang="ts">
	import type { SimpleIcon } from "simple-icons";
    
	export let siObject: SimpleIcon;
	export let size: number = 24; // 기본 크기 설정
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width="{size}"
	height="{size}"
	fill="currentColor"
	aria-hidden="true"
>
	<path d="{siObject.path}" />
</svg>
