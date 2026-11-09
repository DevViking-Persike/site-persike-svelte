import type { PageServerLoad } from './$types';
import { createResumeRepository } from '$lib/server/resume/infrastructure/resume-repository-factory';
import { getResumeUseCase } from '$lib/server/resume/application/get-resume';

function firstSentence(text: string, max = 90): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

export const load: PageServerLoad = async () => {
  const repository = createResumeRepository();
  const resume = await getResumeUseCase(repository);

  const latestExperience = resume.experiences[0];
  const latestEducation = resume.education[resume.education.length - 1];

  return {
    hero: {
      name: resume.fullName,
      title: resume.title
    },
    stations: [
      {
        id: 'inicio',
        title: 'Início',
        subtitle: resume.title
      },
      {
        id: 'sobre',
        title: 'Sobre',
        subtitle: firstSentence(resume.aboutMe)
      },
      {
        id: 'stack',
        title: 'Stack',
        subtitle: resume.highlightStack.slice(0, 5).join(' · ')
      },
      {
        id: 'experiencia',
        title: 'Experiência',
        subtitle: latestExperience
          ? `${latestExperience.role} @ ${latestExperience.company}`
          : ''
      },
      {
        id: 'formacao',
        title: 'Formação',
        subtitle: latestEducation ? latestEducation.institution : ''
      },
      {
        id: 'contato',
        title: 'Contato',
        subtitle: `${resume.contact.email} · ${resume.contact.website}`
      }
    ]
  };
};
