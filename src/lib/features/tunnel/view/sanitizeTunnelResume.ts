import type { ResumeModel, SkillCategory } from '$lib/core/models/resume';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeUrl(value: unknown, localImage = false): string {
  const url = text(value).trim();
  if (/[\\\u0000-\u001f\u007f]/.test(url)) return '';
  if (localImage && url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : '';
  } catch {
    return '';
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
}

/** Keys match the keyed each-blocks, including composite-key collision behavior. */
function rows(value: unknown, keyFields: string[]): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.map(record).filter((row) => {
    if (!keyFields.every((field) => typeof row[field] === 'string')) return false;
    const key = keyFields.map((field) => row[field]).join('');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const categories: readonly SkillCategory[] = ['languages', 'frontend', 'backend', 'cloud-devops'];

/** Normalize the runtime prop boundary; Svelte remains responsible for escaping text. */
export function sanitizeTunnelResume(value: unknown): ResumeModel {
  const input = record(value);
  const contact = record(input.contact);
  const socials = record(input.socials);
  const github = safeUrl(socials.github);
  const linkedin = safeUrl(socials.linkedin);
  return {
    fullName: text(input.fullName),
    title: text(input.title),
    aboutMe: text(input.aboutMe),
    profileImageUrl: safeUrl(input.profileImageUrl, true),
    contact: { phone: text(contact.phone), email: text(contact.email), website: text(contact.website) },
    socials: {
      ...(github ? { github } : {}),
      ...(linkedin ? { linkedin } : {})
    },
    highlightStack: strings(input.highlightStack),
    education: rows(input.education, ['institution', 'period']).map((row) => ({
      institution: text(row.institution), degree: text(row.degree), period: text(row.period)
    })),
    experiences: rows(input.experiences, ['company', 'period']).map((row) => ({
      company: text(row.company), role: text(row.role), period: text(row.period), description: text(row.description),
      ...(Array.isArray(row.techs) ? { techs: strings(row.techs) } : {}),
      ...(typeof row.current === 'boolean' ? { current: row.current } : {})
    })),
    skills: rows(input.skills, ['name']).map((row) => ({
      name: text(row.name),
      percentage: typeof row.percentage === 'number' && Number.isFinite(row.percentage)
        ? Math.min(Math.max(row.percentage, 0), 100) : 0,
      ...(categories.includes(row.category as SkillCategory) ? { category: row.category as SkillCategory } : {})
    }))
  };
}
