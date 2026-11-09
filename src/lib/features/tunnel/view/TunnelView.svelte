<script lang="ts">
  import { browser } from '$app/environment';
  import TunnelCanvas from './TunnelCanvas.svelte';
  import type { TunnelPalette, TunnelProgress, TunnelScene } from '../tunnel/TunnelScene';
  import type { ResumeModel } from '$lib/core/models/resume';
  import Chip from '$lib/design-system/atoms/Chip/Chip.svelte';
  import SectionTitle from '$lib/design-system/atoms/SectionTitle/SectionTitle.svelte';
  import ProfilePhoto from '$lib/design-system/atoms/ProfilePhoto/ProfilePhoto.svelte';
  import ExperienceCard from '$lib/design-system/molecules/ExperienceCard/ExperienceCard.svelte';
  import EducationEntryItem from '$lib/design-system/molecules/EducationEntryItem/EducationEntryItem.svelte';
  import SkillBar from '$lib/design-system/molecules/SkillBar/SkillBar.svelte';
  import ContactItem from '$lib/design-system/molecules/ContactItem/ContactItem.svelte';
  import styles from './TunnelView.module.css';

  let { resume }: { resume: ResumeModel } = $props();

  const sections = [
    { id: 'inicio', label: 'Início', title: 'Início' },
    { id: 'sobre', label: 'Sobre', title: 'Sobre' },
    { id: 'stack', label: 'Stack', title: 'Stack' },
    { id: 'experiencia', label: 'Experiência', title: 'Experiência' },
    { id: 'formacao', label: 'Formação', title: 'Formação' },
    { id: 'contato', label: 'Contato', title: 'Contato' }
  ];

  const palette: TunnelPalette = {
    background: '#0a0a0a',
    accent: '#e8b827',
    muted: '#a1a1a1',
    faint: '#6b6b6b'
  };

  const skillGroups: Array<{ title: string; filter: string }> = [
    { title: 'Linguagens', filter: 'languages' },
    { title: 'Frontend', filter: 'frontend' },
    { title: 'Backend', filter: 'backend' },
    { title: 'Cloud & DevOps', filter: 'cloud-devops' }
  ];

  let mounted = $state(false);
  let active = $state(0);
  let progress = $state(0);
  let scene: TunnelScene | null = null;

  let scrollContainer: HTMLElement | undefined = $state();
  let scrollAnimation = 0;
  let isTravelling = false;

  function handleProgress(p: TunnelProgress): void {
    progress = p.progress;
  }

  function handleReady(s: TunnelScene): void {
    scene = s;
    layoutGates();
    syncScroll();
  }

  function maxScroll(): number {
    if (!scrollContainer) return 1;
    return Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 1);
  }

  function layoutGates(): void {
    if (!scene || !scrollContainer) return;
    const container = scrollContainer;
    const total = maxScroll() + container.clientHeight;
    const centers = sections.map((section) => {
      const element = container.querySelector<HTMLElement>(`#${section.id}`);
      if (!element) return 0;
      const center = element.offsetTop + element.offsetHeight / 2;
      return Math.min(Math.max(center / total, 0), 1);
    });
    scene.setCenters(centers);
  }

  function syncScroll(): void {
    if (!scene || !scrollContainer) return;
    scene.setScroll(scrollContainer.scrollTop / maxScroll());
    // seção ativa = centro da janela mais próximo
    const viewportCenter = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < sections.length; i++) {
      const element = scrollContainer.querySelector<HTMLElement>(`#${sections[i].id}`);
      if (!element) continue;
      const center = element.offsetTop + element.offsetHeight / 2;
      const distance = Math.abs(center - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    active = best;
  }

  function onScroll(): void {
    if (isTravelling) {
      // scroll vindo da própria viagem: só sincroniza, não cancela
      syncScroll();
      return;
    }
    cancelAnimationFrame(scrollAnimation);
    syncScroll();
  }

  /** Intervenção do usuário interrompe a viagem automática. */
  function interruptTravel(): void {
    if (!isTravelling) return;
    isTravelling = false;
    cancelAnimationFrame(scrollAnimation);
  }

  /** Viaja pelo túnel até a seção — scroll animado com easing. */
  function travelTo(index: number): void {
    if (!scrollContainer) return;
    const element = scrollContainer.querySelector<HTMLElement>(`#${sections[index].id}`);
    if (!element) return;
    cancelAnimationFrame(scrollAnimation);
    const start = scrollContainer.scrollTop;
    const target = Math.min(
      Math.max(element.offsetTop - (scrollContainer.clientHeight - element.offsetHeight) / 2, 0),
      maxScroll()
    );
    const distance = Math.abs(target - start);
    if (distance < 4) return;
    const duration = Math.min(Math.max(distance * 0.45, 500), 3200);
    const startTime = performance.now();
    isTravelling = true;

    const step = (now: number) => {
      if (!scrollContainer || !isTravelling) return;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      scrollContainer.scrollTop = start + (target - start) * eased;
      if (t < 1) {
        scrollAnimation = requestAnimationFrame(step);
      } else {
        isTravelling = false;
      }
    };
    scrollAnimation = requestAnimationFrame(step);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      travelTo(Math.min(active + 1, sections.length - 1));
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      travelTo(Math.max(active - 1, 0));
    }
  }

  $effect(() => {
    mounted = true;
    return () => {
      mounted = false;
      cancelAnimationFrame(scrollAnimation);
    };
  });
</script>

<svelte:window
  onkeydown={handleKeydown}
  onresize={() => {
    layoutGates();
    syncScroll();
  }}
/>

<div class={styles.shell}>
  {#if mounted && browser}
    <TunnelCanvas {palette} stations={sections} onProgress={handleProgress} onReady={handleReady} />
  {/if}

  <header class={styles.header}>
    <div class={styles.brand}>
      <span class={styles.badge}>MODO TÚNEL 3D</span>
      <h1 class={styles.name}>{resume.fullName}</h1>
      <p class={styles.title}>{resume.title}</p>
    </div>
    <a class={styles.backLink} href="/">← versão clássica</a>
  </header>

  <nav class={styles.selector} aria-label="Seções do túnel">
    {#each sections as section, index (section.id)}
      <button
        class={[styles.selectorItem, active === index ? styles.selectorActive : ''].join(' ')}
        onclick={() => travelTo(index)}
        aria-current={active === index ? 'true' : undefined}
      >
        <span class={styles.selectorNumber}>{String(index + 1).padStart(2, '0')}</span>
        <span class={styles.selectorLabel}>{section.label}</span>
      </button>
    {/each}
    <div class={styles.selectorTrack} aria-hidden="true">
      <div class={styles.selectorFill} style="height: {progress}%"></div>
    </div>
  </nav>

  <main
    bind:this={scrollContainer}
    class={styles.content}
    onscroll={onScroll}
    onwheel={interruptTravel}
    ontouchstart={interruptTravel}
  >
    <!-- INÍCIO -->
    <section id="inicio" class={styles.section}>
      <div class={styles.console}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 01 // IDENTIFICAÇÃO</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <div class={styles.heroRow}>
            <ProfilePhoto src={resume.profileImageUrl} alt={resume.fullName} />
            <div class={styles.heroText}>
              <SectionTitle title={resume.fullName} />
              <p class={styles.heroTitle}>{resume.title}</p>
              <div class={styles.chips}>
                {#each resume.highlightStack as tech (tech)}
                  <Chip label={tech} variant="accent" />
                {/each}
              </div>
            </div>
          </div>
        </div>
        <div class={styles.consoleFooter}>
          <span>TRANSMISSÃO DIRETA</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>

    <!-- SOBRE -->
    <section id="sobre" class={styles.section}>
      <div class={styles.console}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 02 // SOBRE</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <SectionTitle title="Sobre" />
          <p class={styles.aboutText}>{resume.aboutMe}</p>
        </div>
        <div class={styles.consoleFooter}>
          <span>REGISTRO PESSOAL</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>

    <!-- STACK -->
    <section id="stack" class={styles.section}>
      <div class={[styles.console, styles.wide].join(' ')}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 03 // SISTEMAS E FERRAMENTAS</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <SectionTitle title="Stack" />
          <div class={styles.skillGrid}>
            {#each skillGroups as group (group.filter)}
              {#if resume.skills.filter((skill) => skill.category === group.filter).length > 0}
                <div class={styles.skillColumn}>
                  <h3 class={styles.skillGroupTitle}>{group.title}</h3>
                  {#each resume.skills.filter((skill) => skill.category === group.filter) as skill (skill.name)}
                    <SkillBar name={skill.name} percentage={skill.percentage} />
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        </div>
        <div class={styles.consoleFooter}>
          <span>DIAGNÓSTICO DE SISTEMAS</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>

    <!-- EXPERIÊNCIA -->
    <section id="experiencia" class={styles.section}>
      <div class={[styles.console, styles.wide].join(' ')}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 04 // REGISTRO DE MISSÕES</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <SectionTitle title="Experiência" />
          <div class={styles.stack}>
            {#each resume.experiences as experience (experience.company + experience.period)}
              <ExperienceCard
                company={experience.company}
                role={experience.role}
                period={experience.period}
                description={experience.description}
                techs={experience.techs}
                current={experience.current}
              />
            {/each}
          </div>
        </div>
        <div class={styles.consoleFooter}>
          <span>{resume.experiences.length} MISSÕES REGISTRADAS</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>

    <!-- FORMAÇÃO -->
    <section id="formacao" class={styles.section}>
      <div class={styles.console}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 05 // ACADEMIA</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <SectionTitle title="Formação" />
          <div class={styles.stack}>
            {#each resume.education as education (education.institution + education.period)}
              <EducationEntryItem
                period={education.period}
                institution={education.institution}
                degree={education.degree}
              />
            {/each}
          </div>
        </div>
        <div class={styles.consoleFooter}>
          <span>{resume.education.length} TÍTULOS CARREGADOS</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>

    <!-- CONTATO -->
    <section id="contato" class={styles.section}>
      <div class={styles.console}>
        <div class={styles.consoleHeader}>
          <span>SEÇÃO 06 // COMUNICAÇÃO</span>
          <span class={styles.consoleStatus}><i class={styles.statusDot}></i> ONLINE</span>
        </div>
        <div class={styles.consoleBody}>
          <SectionTitle title="Contato" />
          <div class={styles.stack}>
            <ContactItem label="Telefone" value={resume.contact.phone} />
            <ContactItem label="E-mail" value={resume.contact.email} />
            <ContactItem label="Website" value={resume.contact.website} />
          </div>
          <div class={styles.socials}>
            {#if resume.socials.github}
              <a
                class={styles.socialLink}
                href={resume.socials.github}
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub ↗
              </a>
            {/if}
            {#if resume.socials.linkedin}
              <a
                class={styles.socialLink}
                href={resume.socials.linkedin}
                target="_blank"
                rel="noreferrer noopener"
              >
                LinkedIn ↗
              </a>
            {/if}
          </div>
        </div>
        <div class={styles.consoleFooter}>
          <span>CANAL ABERTO</span>
          <span class={styles.cursor}>█</span>
        </div>
      </div>
    </section>
  </main>

  <footer class={styles.hint}>
    <p class={styles.hintText}>role para viajar · setas ↑↓ ou o seletor à esquerda</p>
  </footer>
</div>
