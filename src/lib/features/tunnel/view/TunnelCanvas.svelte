<script lang="ts">
  import { onMount } from 'svelte';
  import { TunnelScene, type TunnelSceneOptions } from '../tunnel/TunnelScene';
  import styles from './TunnelCanvas.module.css';

  let { options }: { options: TunnelSceneOptions } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let scene: TunnelScene | null = null;

  onMount(() => {
    if (!canvas) return;
    scene = new TunnelScene(canvas, options);
    scene.start();
    return () => {
      scene?.dispose();
      scene = null;
    };
  });
</script>

<canvas bind:this={canvas} class={styles.canvas} aria-label="Túnel 3D interativo"></canvas>
