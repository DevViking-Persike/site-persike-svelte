#!/usr/bin/env bash
set -euo pipefail
task_tmp="$(mktemp -d "${TMPDIR:-/tmp}/site-smoke.XXXXXX")"
trap 'rm -rf "$task_tmp"' EXIT
for host in victorpersike.dev.br www.victorpersike.dev.br; do
  code="$(curl --silent --show-error --fail --retry 15 --retry-all-errors \
    --retry-delay 10 --retry-max-time 240 --max-time 15 \
    -o "$task_tmp/page.html" -w '%{http_code}' "https://$host/")"
  [[ "$code" == 200 ]]
  grep -qi 'Victor Persike' "$task_tmp/page.html"
  printf 'https://%s/ -> HTTP %s, TLS válido e conteúdo do portfólio\n' "$host" "$code"
  redirect="$(curl --silent --show-error --max-time 15 -o /dev/null \
    -w '%{http_code} %{redirect_url}' "http://$host/")"
  [[ "$redirect" == "301 https://$host/" || "$redirect" == "308 https://$host/" ]]
  printf 'http://%s/ -> %s\n' "$host" "$redirect"
done
