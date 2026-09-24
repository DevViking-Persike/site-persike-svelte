#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-$repo_dir/../../infra-k8s}"
target="$(cd "$target" && pwd)"
git -C "$target" rev-parse --show-toplevel >/dev/null
if [[ -L "$repo_dir/infra-k8s" ]]; then
  [[ "$(cd "$repo_dir/infra-k8s" && pwd -P)" == "$target" ]] || {
    echo 'infra-k8s já aponta para outro diretório; ajuste o link explicitamente.' >&2
    exit 1
  }
elif [[ -e "$repo_dir/infra-k8s" ]]; then
  echo 'infra-k8s já existe e não é symlink.' >&2
  exit 1
else
  ln -s "$target" "$repo_dir/infra-k8s"
fi
printf 'infra-k8s -> %s\n' "$target"
