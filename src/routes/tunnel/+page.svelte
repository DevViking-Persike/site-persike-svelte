<script lang="ts">
  import TunnelView from '$lib/features/tunnel/view/TunnelView.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.hero.name} — Túnel 3D</title>
  <meta name="description" content="Portfólio de {data.hero.name} em modo túnel 3D interativo." />
</svelte:head>

<TunnelView hero={data.hero} stations={data.stations} />
