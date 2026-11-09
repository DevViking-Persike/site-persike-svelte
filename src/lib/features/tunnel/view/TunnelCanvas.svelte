<script lang="ts">
  import { onMount } from 'svelte';
  import { TunnelScene, type TunnelPalette, type TunnelProgress } from '../tunnel/TunnelScene';
  import styles from './TunnelCanvas.module.css';

  interface Props {
    palette: TunnelPalette;
    stations: Array<{ id: string; title: string }>;
    onProgress?: (progress: TunnelProgress) => void;
    onReady?: (scene: TunnelScene) => void;
  }

  let { palette, stations, onProgress, onReady }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let scene: TunnelScene | null = null;

  onMount(() => {
    if (!canvas) return;
    scene = new TunnelScene(canvas, { palette, onProgress });
    for (const [index, station] of stations.entries()) {
      scene.addStationGate(station.title, index);
    }
    onReady?.(scene);
    scene.start();
    return () => {
      scene?.dispose();
      scene = null;
    };
  });
</script>

<canvas bind:this={canvas} class={styles.canvas} aria-hidden="true"></canvas>
