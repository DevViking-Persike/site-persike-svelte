import type { PageServerLoad } from './$types';
import { createResumeRepository } from '$lib/server/resume/infrastructure/resume-repository-factory';
import { getResumeUseCase } from '$lib/server/resume/application/get-resume';

export const load: PageServerLoad = async () => {
  const repository = createResumeRepository();
  const resume = await getResumeUseCase(repository);
  return { resume };
};
