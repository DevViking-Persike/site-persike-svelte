#!/usr/bin/env bash
set -euo pipefail
: "${RELEASE:?RELEASE ausente}"
: "${IMAGE_DIGEST:?IMAGE_DIGEST ausente}"
[[ "$RELEASE" =~ ^prod-[a-f0-9]+-[0-9]+-[0-9]+$ ]]
[[ "$IMAGE_DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]
source_dir="$(pwd)/deploy/kubernetes"
task_tmp="$(mktemp -d)"
# shellcheck disable=SC2329 # Invocada pelo trap EXIT.
cleanup() {
  git worktree remove --force "$task_tmp/manifests" >/dev/null 2>&1 || true
  rm -rf "$task_tmp"
}
trap 'cleanup' EXIT
git config user.name 'site-persike-ci'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
remote_ref="$(git ls-remote --heads origin refs/heads/gitops)"
if [[ -n "$remote_ref" ]]; then
  git fetch origin gitops
  git worktree add --detach "$task_tmp/manifests" FETCH_HEAD
else
  # Branch independente: não inclui código, .gitmodules nem infra privada.
  git worktree add --detach "$task_tmp/manifests" HEAD
  git -C "$task_tmp/manifests" switch --orphan site-gitops-init
fi
target="$task_tmp/manifests"
# A branch gitops é gerada integralmente a partir dos manifests deste build.
git -C "$target" ls-files -z | while IFS= read -r -d '' tracked; do
  rm -f -- "$target/$tracked"
done
cp "$source_dir"/*.yaml "$target/"
# Namespace é bootstrap da plataforma, não um recurso podável da aplicação.
rm "$target/namespace.yaml"
python3 - "$target/kustomization.yaml" <<'PY'
import os, pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
text = re.sub(r'    newTag: .*\n(?:    digest: .*\n)?',
              f'    newTag: {os.environ["RELEASE"]}\n    digest: {os.environ["IMAGE_DIGEST"]}\n', text)
path.write_text(text)
PY
kubectl kustomize "$target" > /dev/null
git -C "$target" add --all
git -C "$target" diff --cached --quiet && exit 0
git -C "$target" commit -m "deploy: meu-site $RELEASE"
for attempt in 1 2 3; do
  if git -C "$target" push origin HEAD:gitops; then
    exit 0
  fi
  git -C "$target" fetch origin gitops
  git -C "$target" rebase FETCH_HEAD
  echo "Nova tentativa de push: $attempt"
done
echo 'Falha ao publicar manifests no Git.' >&2
exit 1
