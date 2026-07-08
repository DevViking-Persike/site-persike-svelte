import type { ResumeModel } from '$lib/core/models/resume';
import type { ResumeRepository } from '$lib/server/resume/domain/resume-repository';

const resume: ResumeModel = {
  fullName: 'Victor Persike',
  title: 'Desenvolvedor Full-Stack',
  profileImageUrl: '/images/profile.jpg',
  aboutMe:
    'Tenho 9 anos de experiência na área da educação, atuando na formação de professores e no ensino básico, com foco em treinamentos em oficinas maker. Em 2018, decidi mudar de carreira e me especializar no desenvolvimento front-end. Desde então, trabalhei com tecnologias como WordPress e Moodle, além de desenvolver projetos com Angular, Node.js, Ionic e Nz-Zorro. Mais recentemente, tenho me dedicado ao uso de React, C#, SQL Server e Azure DevOps. Além disso, venho expandindo meus conhecimentos em linguagens como Python e Go, explorando suas possibilidades em projetos pessoais e buscando novas oportunidades de aprendizado e inovação.',
  contact: {
    phone: '+55 11 95705-7466',
    email: 'dev.victor.persike@gmail.com',
    website: 'www.victorpersike.dev.br'
  },
  socials: {
    github: 'https://github.com/DevViking-Persike',
    linkedin: 'https://www.linkedin.com/in/victor-raphael-persike-silva-78515b71/'
  },
  highlightStack: ['C#', '.NET', 'React', 'Angular', 'AWS', 'Docker', 'Go'],
  education: [
    { period: '2026 — 2028', institution: 'Esalq/USP — Universidade de São Paulo', degree: 'MBA em Cybersegurança' },
    { period: '2026 — 2027/02', institution: 'Full Cycle', degree: 'MBA em Engenharia de Software com IA' },
    { period: '2024 — 2025/07', institution: 'Full Cycle', degree: 'MBA Arquitetura Full Cycle' },
    { period: '2022 — 2026', institution: 'Faculdade Descomplica', degree: 'Ciências da Computação EAD' },
    { period: '2021 — 2022', institution: 'RecodePro', degree: 'Programação FullStack 520 horas' },
    { period: '2012 — 2022', institution: 'Universidade de São Paulo', degree: 'Licenciatura em Física' },
    {
      period: '2019/06 — 2019/11',
      institution: 'SP Escola de Teatro',
      degree: 'Game Design — Criando jogos, do tabuleiro ao digital'
    }
  ],
  experiences: [
    {
      company: 'Avita',
      role: 'Desenvolvedor Full-Stack Senior',
      period: '11/25 — Atual',
      current: true,
      techs: ['Angular', 'C#', '.NET', 'Dapper', 'Keycloak', 'JWT', 'RabbitMQ', 'GitLab CI/CD', 'AWS'],
      description:
        'Atuo como Fullstack Senior em um ecossistema de microserviços, com foco em Angular no front-end e C#/.NET no back-end. Desenvolvo e evoluo APIs em um microserviço dedicado usando Dapper, garantindo performance e consistência nas regras de negócio. Também integro e faço a sustentação de autenticação/autorização com Keycloak, trabalhando com JWT e fluxos de SSO. Implemento comunicação assíncrona e eventos com RabbitMQ, além de integrações com diversos serviços para processos de apólices de seguros, validações e automações. No dia a dia, uso GitLab (CI/CD) e AWS.'
    },
    {
      company: 'Caixa Vida e Previdência',
      role: 'Desenvolvedor Full-Stack',
      period: '12/24 — 11/25',
      techs: ['C#', 'Microsserviços', 'React'],
      description:
        'Atuei como desenvolvedor fullstack, com foco no back-end em C#, desenvolvendo microsserviços e soluções em gateway de autenticação e gestão de arquivos. No front-end, contribuí com a implementação de interfaces utilizando React, garantindo integração eficiente entre as camadas e uma experiência de uso consistente.'
    },
    {
      company: 'Ingram Micro',
      role: 'Desenvolvedor Full-Stack',
      period: '10/23 — 11/24',
      techs: ['C# MVC', 'jQuery', 'React', 'Micro front-ends', 'Microsserviços C#', 'Windows Server', 'DevOps'],
      description:
        'Na Ingram, atuei na squad de contabilidade desenvolvendo soluções para automação de processos contábeis. No front-end, trabalhei com MVC em C# e jQuery em sistemas legados e com React utilizando micro front-ends. No back-end, desenvolvi microsserviços em C#, além de gerenciar o ambiente on-premise com servidores Windows, sendo responsável por atividades de DevOps, incluindo deploy e manutenção contínua dos sistemas.'
    },
    {
      company: 'Totvs Meu Protheus',
      role: 'Desenvolvedor Mobile',
      period: '07/23 — 02/24',
      techs: ['Angular 15', 'Ionic', 'Firebase'],
      description:
        'Na TOTVS, participei do desenvolvimento de aplicativos móveis com Angular 15 e Ionic, integrando serviços do Firebase para autenticação e envio de notificações push. Contribuí para a entrega de funcionalidades avançadas e uma experiência de usuário otimizada.'
    },
    {
      company: 'Saúde One',
      role: 'Desenvolvedor Full-Stack',
      period: '04/23 — 10/23',
      techs: ['Angular', 'C#', '.NET 5', 'SQL Server', 'Dapper', 'EF', 'Azure DevOps', 'Scrum'],
      description:
        'Na Saúde One, atuei no desenvolvimento front-end com Angular e back-end com C# em sistemas legados com SQL Server. Trabalhei com DevOps na Azure, seguindo Scrum e utilizando Jira para gestão. Apliquei DDD, Clean Code, SOLID e testes automatizados. Também gerenciei equipe de sustentação, planejei projetos e integrei serviços externos.'
    },
    {
      company: 'AR3 Capital',
      role: 'Desenvolvedor Full-Cycle',
      period: '07/22 — 04/23',
      techs: ['React', 'C#', '.NET', 'SQL Server', 'EF', 'Dapper', 'Azure DevOps', 'Scrum'],
      description:
        'Na AR3, atuei como desenvolvedor fullstack focado na manutenção e evolução de sistemas legados. No front usei React e no back C#/.NET com SQL Server (EF e Dapper), aplicando Clean Code e SOLID com forte visão de refatoração. Também participei de sustentação, suporte técnico e priorização de demandas, além de DevOps na Azure com pipelines, em rotina ágil (Scrum/Jira).'
    },
    {
      company: 'Usucampeão',
      role: 'Desenvolvedor Full-Stack',
      period: '06/21 — 07/22',
      techs: ['Angular', 'Ionic', 'NestJS', 'Akita', 'NG-Zorro', 'Firebase', 'PWA'],
      description:
        'Atuei como desenvolvedor fullstack júnior, contribuindo com aplicações em Angular e Ionic no front-end e NestJS no back-end. Trabalhei com Akita para gerenciamento de estado e participei da criação de interfaces com NG-Zorro em um sistema de gestão integrado a um app mobile. No back-end, desenvolvi e integrei APIs RESTful, além de implementar recursos com Firebase, como autenticação, banco de dados em tempo real e notificações. Também participei da construção de uma PWA, focando em uma experiência fluida e próxima de um aplicativo nativo.'
    }
  ],
  skills: [
    { name: 'C#', percentage: 80, category: 'languages' },
    { name: 'JavaScript', percentage: 70, category: 'languages' },
    { name: 'Go', percentage: 70, category: 'languages' },
    { name: 'Python / Rust', percentage: 57, category: 'languages' },
    { name: 'Angular, React', percentage: 70, category: 'frontend' },
    { name: 'DevOps, Azure, AWS', percentage: 70, category: 'cloud-devops' },
    { name: 'Docker', percentage: 75, category: 'cloud-devops' }
  ]
};

export class StaticResumeRepository implements ResumeRepository {
  async getResume(): Promise<ResumeModel> {
    return structuredClone(resume);
  }
}
