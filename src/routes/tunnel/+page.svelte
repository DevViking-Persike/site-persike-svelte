<script lang="ts">
  import TunnelView from '$lib/features/tunnel/view/TunnelView.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.resume.fullName} — Túnel 3D</title>
  <meta name="description" content="Portfólio de {data.resume.fullName} em modo túnel 3D interativo." />
</svelte:head>

<TunnelView resume={data.resume} />
