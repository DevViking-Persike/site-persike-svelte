#!/usr/bin/env bash
# Credencial administrativa temporária; API e registry passam pelo SSH do h6.
set -euo pipefail
[[ $# -gt 0 ]] || { echo "Uso: $0 <comando> [args...]" >&2; exit 1; }
umask 077
task_tmp="$(mktemp -d "${TMPDIR:-/tmp}/site-persike.XXXXXX")"
identity="${FLEX_SSH_IDENTITY:-$HOME/.ssh/devviking}"
control_plane="${FLEX_CONTROL_PLANE:-ubuntu@163.176.83.58}"
worker="${FLEX_WORKER:-h6}"
ssh_opts=(-i "$identity" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=10)
cleanup() {
  ssh -S "$task_tmp/ssh" -O exit "$worker" >/dev/null 2>&1 || true
  rm -rf "$task_tmp"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export KUBECONFIG="$task_tmp/kubeconfig"
ssh -n "${ssh_opts[@]}" "$control_plane" 'sudo cat /etc/kubernetes/admin.conf' >"$KUBECONFIG"
read -r api_port registry_port < <(python3 - <<'PY'
import socket
with socket.socket() as api, socket.socket() as registry:
    api.bind(('127.0.0.1', 0))
    registry.bind(('127.0.0.1', 0))
    print(api.getsockname()[1], registry.getsockname()[1])
PY
)
ssh "${ssh_opts[@]}" -M -S "$task_tmp/ssh" -fnNT \
  -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  -L "127.0.0.1:$api_port:127.0.0.1:8443" \
  -L "127.0.0.1:$registry_port:127.0.0.1:30500" "$worker"
cluster="$(kubectl config view -o jsonpath='{.clusters[0].name}')"
kubectl config set-cluster "$cluster" --server="https://127.0.0.1:$api_port" >/dev/null
kubectl --request-timeout=15s get node h6 -o name
export SITE_REGISTRY_TUNNEL="127.0.0.1:$registry_port"
"$@"
