<script lang="ts">
  import ProfilePhoto from '$lib/design-system/atoms/ProfilePhoto/ProfilePhoto.svelte';
  import Chip from '$lib/design-system/atoms/Chip/Chip.svelte';
  import IconLink from '$lib/design-system/atoms/IconLink/IconLink.svelte';
  import Icon from '$lib/design-system/atoms/Icon/Icon.svelte';
  import styles from './HeroSection.module.css';

  interface Props {
    name: string;
    title: string;
    profileImage: string;
    aboutMe: string;
    highlightStack: string[];
    email: string;
    githubUrl?: string;
    linkedinUrl?: string;
    currentRole?: string;
    cvHref?: string;
  }

  let {
    name,
    title,
    profileImage,
    aboutMe,
    highlightStack,
    email,
    githubUrl,
    linkedinUrl,
    currentRole,
    cvHref = '/docs/curriculo-persike.pdf'
  }: Props = $props();
</script>

<section id="sobre" class={styles.hero}>
  <div class={styles.inner}>
    <div class={styles.intro}>
      {#if currentRole}
        <div class={styles.statusBadge}>
          <span class={styles.statusDot}></span>
          <span class={styles.statusText}>{currentRole}</span>
        </div>
      {/if}

      <h1 class={styles.name}>{name}</h1>
      <p class={styles.role}>{title}</p>

      <div class={styles.stack}>
        {#each highlightStack as tech}
          <Chip label={tech} variant="default" />
        {/each}
      </div>

      <p class={styles.about}>{aboutMe}</p>

      <div class={styles.actions}>
        <IconLink
          href="/tunnel"
          label="Modo Túnel 3D"
          variant="primary"
          ariaLabel="Explorar o portfólio no modo túnel 3D"
        >
          {#snippet icon()}
            <Icon name="sparkles" />
          {/snippet}
        </IconLink>

        <IconLink href="mailto:{email}" label={email} variant="default" ariaLabel="Enviar email">
          {#snippet icon()}
            <Icon name="email" />
          {/snippet}
        </IconLink>

        {#if linkedinUrl}
          <IconLink href={linkedinUrl} label="LinkedIn" variant="default" external ariaLabel="Perfil no LinkedIn">
            {#snippet icon()}
              <Icon name="linkedin" />
            {/snippet}
          </IconLink>
        {/if}

        {#if githubUrl}
          <IconLink href={githubUrl} label="GitHub" variant="default" external ariaLabel="Perfil no GitHub">
            {#snippet icon()}
              <Icon name="github" />
            {/snippet}
          </IconLink>
        {/if}

        <IconLink href={cvHref} label="Baixar CV" variant="default" download ariaLabel="Baixar currículo em PDF">
          {#snippet icon()}
            <Icon name="download" />
          {/snippet}
        </IconLink>
      </div>
    </div>

    <div class={styles.portrait}>
      <ProfilePhoto src={profileImage} alt={name} />
    </div>
  </div>

  <div class={styles.glow} aria-hidden="true"></div>
</section>
