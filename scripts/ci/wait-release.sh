#!/usr/bin/env bash
set -euo pipefail
: "${EXPECTED_REVISION:?EXPECTED_REVISION ausente}"
task_tmp="$(mktemp -d)"
trap 'rm -rf "$task_tmp"' EXIT
for attempt in $(seq 1 60); do
  ready=true
  for host in victorpersike.dev.br www.victorpersike.dev.br; do
    if ! curl --fail --silent --show-error --max-time 10 \
      "https://$host/healthz" -o "$task_tmp/health.json" ||
      ! jq -e --arg revision "$EXPECTED_REVISION" \
        '.status == "ok" and .revision == $revision' "$task_tmp/health.json" >/dev/null; then
      ready=false
    fi
  done
  if [[ "$ready" == true ]]; then
    echo "Release confirmada no apex e www: $EXPECTED_REVISION"
    exit 0
  fi
  echo "Aguardando Argo CD/certificado: tentativa $attempt/60"
  sleep 10
done
echo 'Argo CD não disponibilizou a release esperada dentro do prazo.' >&2
exit 1
