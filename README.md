# MeuSite — Portfolio Victor Persike

Currículo/portfólio web com SSR, construído em **SvelteKit 2 + Svelte 5**.

A arquitetura segue o modelo do projeto SeguraPro: design system atômico, camadas hexagonais no servidor (domain / application / infrastructure) e factory de repositórios selecionada por variável de ambiente.

## Pré-requisitos

- Node 22+
- pnpm 10 (`corepack enable`)

## Como rodar

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

## Build de produção

```bash
pnpm build
pnpm start        # node build/index.js
```

## Docker

```bash
docker compose up -d   # http://localhost:5173
docker compose logs -f web
docker compose down
```

## Script utilitário

```bash
./run.sh help
./run.sh dev
./run.sh build
./run.sh docker-up
```

## Variáveis de ambiente

| Var                          | Default  | Descrição                                    |
| ---------------------------- | -------- | -------------------------------------------- |
| `MEUSITE_BACKEND_PROVIDER`   | `static` | Repositório de dados (atualmente só estático) |
| `BASE_PATH`                  | (vazio)  | Prefixo de rota (ex.: `/portfolio`)          |
| `PORT`                       | `5173`   | Porta do servidor adapter-node               |
| `HOST`                       | `0.0.0.0`| Host do servidor adapter-node                |

## Estrutura

```
src/
├── app.html / app.css / app.d.ts / hooks.server.ts
├── lib/
│   ├── core/{models,utils,navigation.ts}
│   ├── platform/runtime.ts
│   ├── design-system/{atoms,molecules,organisms,templates}/
│   ├── features/resume/view/
│   └── server/
│       ├── shared/config/
│       └── resume/{domain,application,infrastructure}/
└── routes/
    ├── +layout.svelte
    ├── +page.server.ts   # SSR loader
    └── +page.svelte
```

## Convenções

- **SSR-first**: dados carregados em `+page.server.ts` via use case
- **Hexagonal**: `domain` (interface) → `application` (use case) → `infrastructure` (impl + factory)
- **Atomic design**: atoms → molecules → organisms → templates
- **CSS Modules** + `var(--token)` em `app.css`
- **Svelte 5 runes** (`$state`, `$derived`, `$props`)

## Produção — GitHub Actions → Zot → Argo CD → h6

Site: <https://victorpersike.dev.br> e <https://www.victorpersike.dev.br>.

O push na `main` executa `.github/workflows/deploy.yml`: valida o Svelte/build,
gera uma imagem **linux/amd64**, publica no Zot e grava os manifests na branch
`gitops` deste mesmo repositório. O Argo CD acompanha essa branch com o projeto
**`meu-site`** e a aplicação **`meu-site`**, restritos ao namespace `site-persike`.
O Deployment é agendado no **h6**; a borda HTTPS continua no **flex1a**.

O job de publicação usa runners do GitHub e apenas `ZOT_USER`, `ZOT_PASSWORD`
e o `GITHUB_TOKEN` com `contents: write`. A CI não recebe SSH nem kubeconfig.
O upload ao Zot usa regctl e chunks de 32 MiB, como no Amanda. A credencial de
pull é mantida pelo Infisical Operator a partir do projeto de plataforma.

Tags seguem `prod-<commit>-<run>-<attempt>` e o manifest fixa também o digest.
`/healthz` retorna a release embutida na imagem; a esteira só passa quando apex
e www servem essa release por HTTPS e o portfólio responde HTTP 200. Há também
smoke agendado a cada 6 horas. Falhas ficam vermelhas no Actions; para rollback,
reverta o commit correspondente da branch `gitops` (o Argo fará a reconciliação).

Detalhes operacionais: [deploy/README.md](deploy/README.md).
