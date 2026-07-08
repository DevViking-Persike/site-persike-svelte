<script lang="ts">
  import type { EducationEntry } from '$lib/core/models/resume';
  import SectionHeader from '$lib/design-system/atoms/SectionHeader/SectionHeader.svelte';
  import EducationEntryItem from '$lib/design-system/molecules/EducationEntryItem/EducationEntryItem.svelte';
  import styles from './EducationSection.module.css';

  interface Props {
    education: EducationEntry[];
  }

  let { education }: Props = $props();
</script>

<section id="educacao" class={styles.section}>
  <div class={styles.inner}>
    <SectionHeader
      number="02"
      label="Formação"
      title="Educação"
      description="Formação contínua em ciência da computação, cybersegurança, arquitetura de software, IA e fundamentos em física e game design."
    />

    <div class={styles.grid}>
      {#each education as entry}
        <EducationEntryItem
          period={entry.period}
          institution={entry.institution}
          degree={entry.degree}
        />
      {/each}
    </div>
  </div>
</section>
