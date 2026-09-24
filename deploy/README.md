# Operação do site

## Infra compartilhada

- `infra-k8s`: symlink local, ignorado pelo Git, para `/Volumes/HDX/Dev/infra-k8s`.
- `vendor/infra-k8s`: submódulo fixado em commit do mesmo repositório privado.
- A aplicação, seus manifests e seu DNS são mantidos neste repositório.

Em outro clone:

```bash
git submodule update --init vendor/infra-k8s
./scripts/link-infra.sh /caminho/do/infra-k8s
```

O symlink não substitui o gitlink. Atualizar o submódulo é uma mudança explícita
de commit; editar o symlink altera a pasta compartilhada original. A CI e o Argo
não precisam clonar esse submódulo para compilar ou publicar o site.

## Esteira

1. Push na `main` ou `gh workflow run deploy.yml --ref main`.
2. CI: dependências com lockfile, `pnpm check`, `pnpm test`, build e kustomize.
   O projeto ainda não contém testes unitários; o comando permite essa ausência.
3. Build amd64, publicação HTTPS em `zot.victorpersike.dev.br/meusite` e validação
   da arquitetura/digest no registry.
4. Commit automático na branch `gitops`, contendo só os manifests de
   `deploy/kubernetes` com a release e o digest publicados.
5. Argo CD, projeto/aplicação `meu-site`, sincroniza `gitops:.` no namespace
   `site-persike` com auto-sync, prune e self-heal.
6. A CI espera `/healthz` devolver a release exata e testa página e redirects.

O cluster faz pull via `127.0.0.1:30500/meusite`; é o mesmo Zot, pelo NodePort
interno configurado nos nós. O Operator gera `site-persike/zot-creds` a partir
de `plataforma-dev-pg-zn`, ambiente `dev`, pasta `/zot`.

A branch `gitops` é independente para que o Argo leia apenas a implantação;
nenhuma credencial do repositório privado de infraestrutura é necessária.
Não edite a imagem no cluster: self-heal restaura o Git. Rollback:

```bash
git fetch origin gitops
git worktree add /tmp/site-persike-rollback origin/gitops
git -C /tmp/site-persike-rollback revert <commit-da-release>
git -C /tmp/site-persike-rollback push origin HEAD:gitops
```

## Bootstrap e diagnóstico via SSH do h6

`scripts/with-cluster.sh` usa `~/.ssh/devviking`, obtém temporariamente o
kubeconfig do control-plane e abre túneis SSH pelo **h6** para API e registry.
O kubeconfig fica em diretório temporário com permissões restritas e é removido
ao encerrar. Não é enviado ao GitHub. Requer acesso administrativo de operador.

Overrides: `FLEX_SSH_IDENTITY`, `FLEX_CONTROL_PLANE` (padrão
`ubuntu@163.176.83.58`) e `FLEX_WORKER` (padrão `h6`, do SSH config).

Bootstrap único, após a primeira publicação criar a branch `gitops`:

```bash
./scripts/with-cluster.sh kubectl apply --server-side -f deploy/kubernetes/namespace.yaml
./scripts/with-cluster.sh kubectl apply --server-side -f deploy/argocd/project.yaml
./scripts/with-cluster.sh kubectl apply --server-side -f deploy/argocd/application.yaml
```

Diagnóstico:

```bash
./scripts/with-cluster.sh kubectl -n argocd get application meu-site
./scripts/with-cluster.sh kubectl -n site-persike get pods -o wide
./scripts/smoke.sh
```

## Terraform DNS

`terraform/dns` adota exclusivamente os A records de `victorpersike.dev.br`
e `www.victorpersike.dev.br`, ambos DNS-only para `163.176.29.184` (flex1a),
TTL de 120 segundos. O h6 executa o site e recebe tráfego pela rede do cluster.

O Terraform original em `infra-k8s/terraform/cloudflare` é um scaffold sem state
com os IPs da frota antiga. **Não aplicar aquele root**: os registros do site são
geridos por este root isolado. Antes da primeira alteração, `dns.py` consulta a
API e importa os IDs existentes. Recusa registros ambíguos/AAAA/CNAME e protege
contra remoção/substituição.

```bash
./scripts/with-cluster.sh python3 scripts/dns.py plan
# Conferir o plano; somente então aplicar exatamente o plano salvo:
./scripts/with-cluster.sh python3 scripts/dns.py apply
```

O token vem de `traefik/cloudflare-dns` ou de `CLOUDFLARE_API_TOKEN` já presente
no ambiente; nunca é impresso ou gravado em `.tfvars`. State, backup e plano
ficam locais em `deploy/terraform/dns`, ignorados pelo Git. Preserve o state;
outro clone pode readotar os mesmos IDs com `plan`, mas não execute dois states
concorrentes sobre estes registros.

Referências: [Git submodules no Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/#git-submodules)
e [import do provider Cloudflare v4](https://registry.terraform.io/providers/cloudflare/cloudflare/4.52.0/docs/resources/record).
