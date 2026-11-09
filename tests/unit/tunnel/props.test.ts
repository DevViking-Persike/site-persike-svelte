import { describe, expect, it } from 'vitest';
import { sanitizeTunnelResume } from '../../../src/lib/features/tunnel/view/sanitizeTunnelResume';

const emptyResume = {
  fullName: '', title: '', aboutMe: '', profileImageUrl: '',
  contact: { phone: '', email: '', website: '' }, socials: {},
  highlightStack: [], education: [], experiences: [], skills: []
};

describe('TunnelView props sanitization', () => {
  it('filters malformed list entries and defaults optional nested fields', () => {
    const result = sanitizeTunnelResume({
      fullName: 10, title: {}, contact: null, socials: [],
      highlightStack: ['TS', null, 123],
      skills: [null, {}, 1, { name: 'TS', percentage: '90', category: 'unknown' }],
      education: [null, {}, { institution: 'School', degree: 'CS', period: '2020' }],
      experiences: [null, {}, { company: 'Company', role: 'Dev', period: '2021', techs: ['TS', 1], current: 'true' }]
    });
    expect(result.fullName).toBe('');
    expect(result.title).toBe('');
    expect(result.contact).toEqual(emptyResume.contact);
    expect(result.socials).toEqual({});
    expect(result.highlightStack).toEqual(['TS']);
    expect(result.skills).toEqual([{ name: 'TS', percentage: 0 }]);
    expect(result.education).toEqual([{ institution: 'School', degree: 'CS', period: '2020' }]);
    expect(result.experiences).toEqual([{ company: 'Company', role: 'Dev', period: '2021', description: '', techs: ['TS'] }]);
  });

  it.each([[-20, 0], [120, 100], [NaN, 0], [Infinity, 0], [-Infinity, 0], [42.5, 42.5]])('bounds skill percentages (%s -> %s)', (percentage, expected) => {
    expect(sanitizeTunnelResume({ skills: [{ name: 'TS', percentage }] }).skills[0].percentage).toBe(expected);
  });

  it('removes duplicate keys used by the view without changing list order', () => {
    const experience = { company: 'Company', period: '2021', role: 'Dev', techs: ['TS', 'TS'] };
    const education = { institution: 'School', period: '2020', degree: 'CS' };
    const result = sanitizeTunnelResume({
      highlightStack: ['TS', 'TS', 'Svelte'],
      skills: [{ name: 'TS', percentage: 90 }, { name: 'TS', percentage: 10 }],
      experiences: [experience, experience], education: [education, education]
    });
    expect(result.highlightStack).toEqual(['TS', 'Svelte']);
    expect(result.skills).toEqual([{ name: 'TS', percentage: 90 }]);
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0].techs).toEqual(['TS']);
    expect(result.education).toEqual([education]);
  });
  it.each(['javascript:alert(1)', 'data:text/html,bad', '//evil.test/x', 'ftp://evil.test', 'not a URL'])('rejects unsafe URL props (%s)', (url) => {
    const result = sanitizeTunnelResume({ profileImageUrl: url, socials: { github: url, linkedin: url } });
    expect(result.profileImageUrl).toBe('');
    expect(result.socials).toEqual({});
  });

  it('allows local image paths and absolute HTTPS image URLs', () => {
    expect(sanitizeTunnelResume({ profileImageUrl: '/images/photo.jpg' }).profileImageUrl).toBe('/images/photo.jpg');
    expect(sanitizeTunnelResume({ profileImageUrl: 'https://example.test/photo.jpg' }).profileImageUrl).toBe('https://example.test/photo.jpg');
    expect(sanitizeTunnelResume({ profileImageUrl: '/\\\\evil.test/photo.jpg' }).profileImageUrl).toBe('');
    expect(sanitizeTunnelResume({ profileImageUrl: '/\n/evil.test/photo.jpg' }).profileImageUrl).toBe('');
  });
  it.each([null, undefined, 42, 'resume', [], {}])('defaults invalid or missing resume fields (%j)', (input) => {
    expect(sanitizeTunnelResume(input)).toEqual(emptyResume);
  });

  it('preserves valid resume data without mutating the original', () => {
    const input = {
      fullName: 'Example Developer', title: 'Full-stack', aboutMe: 'Texto <em>literal</em>',
      profileImageUrl: '/images/profile.jpg',
      contact: { phone: '+00 123', email: 'dev@example.test', website: 'https://example.test' },
      socials: { github: 'https://github.com/example', linkedin: 'https://www.linkedin.com/in/example' },
      highlightStack: ['TypeScript', 'Svelte'],
      education: [{ institution: 'School', degree: 'CS', period: '2020' }],
      experiences: [{ company: 'Company', role: 'Developer', period: '2021', description: 'Work', techs: ['TS'], current: true }],
      skills: [{ name: 'TypeScript', percentage: 90, category: 'languages' as const }]
    };
    const before = structuredClone(input);
    const result = sanitizeTunnelResume(input);
    expect(result).toEqual(input);
    expect(input).toEqual(before);
    expect(result.skills).not.toBe(input.skills);
  });
});
