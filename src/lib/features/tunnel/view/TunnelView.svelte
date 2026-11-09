<script lang="ts">
  import { browser } from '$app/environment';
  import TunnelCanvas from './TunnelCanvas.svelte';
  import type { TunnelPalette, TunnelSceneOptions, TunnelStation } from '../tunnel/TunnelScene';
  import styles from './TunnelView.module.css';

  interface Hero {
    name: string;
    title: string;
  }

  let { hero, stations }: { hero: Hero; stations: TunnelStation[] } = $props();

  let mounted = $state(false);
  let progress = $state(0);
  let stationIndex = $state(0);
  let speed = $state(0.35);

  const palette: TunnelPalette = {
    background: '#0a0a0a',
    accent: '#e8b827',
    muted: '#a1a1a1',
    faint: '#6b6b6b'
  };

  // svelte-ignore state_referenced_locally
  // estações vêm do load uma vez por navegação — capturar o valor inicial é intencional
  const options: TunnelSceneOptions = {
    stations,
    palette,
    onProgress: (p) => {
      progress = p.progress;
      stationIndex = p.stationIndex;
      speed = p.speed;
    }
  };

  $effect(() => {
    mounted = true;
    return () => {
      mounted = false;
    };
  });

  const current = $derived(stations[stationIndex] ?? stations[0]);
  const speedPct = $derived(Math.round(speed * 100));
</script>

<div class={styles.shell}>
  {#if mounted && browser}
    <TunnelCanvas {options} />
  {:else}
    <div class={styles.fallback} role="status">
      <p class={styles.fallbackTitle}>Preparando o túnel…</p>
      <p class={styles.fallbackText}>
        {hero.name} — {hero.title}
      </p>
    </div>
  {/if}

  <header class={styles.header}>
    <div class={styles.brand}>
      <span class={styles.badge}>MODO TÚNEL 3D</span>
      <h1 class={styles.name}>{hero.name}</h1>
      <p class={styles.title}>{hero.title}</p>
    </div>
    <a class={styles.backLink} href="/">← versão clássica</a>
  </header>

  <footer class={styles.hud}>
    <div class={styles.station}>
      <span class={styles.stationIndex}>
        {String(stationIndex + 1).padStart(2, '0')}/{String(stations.length).padStart(2, '0')}
      </span>
      <div class={styles.stationInfo}>
        <span class={styles.stationTitle}>{current?.title ?? ''}</span>
        <span class={styles.stationSubtitle}>{current?.subtitle ?? ''}</span>
      </div>
    </div>

    <div class={styles.meters}>
      <div class={styles.meter} role="progressbar" aria-valuenow={progress} aria-label="Progresso do túnel">
        <span class={styles.meterLabel}>DISTÂNCIA</span>
        <div class={styles.bar}>
          <div class={styles.barFill} style="width: {progress}%"></div>
        </div>
      </div>
      <div class={styles.meter}>
        <span class={styles.meterLabel}>VELOCIDADE</span>
        <div class={styles.bar}>
          <div class={[styles.barFill, styles.accentFill].join(' ')} style="width: {speedPct}%"></div>
        </div>
      </div>
    </div>

    <p class={styles.help}>
      mouse = direção &nbsp;·&nbsp; clique ou <kbd>W</kbd> = acelerar &nbsp;·&nbsp;
      <kbd>S</kbd> = frear
    </p>
  </footer>
</div>
