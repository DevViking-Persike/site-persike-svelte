#!/usr/bin/env python3
"""Adota somente apex/www no Terraform. Token nunca é gravado nem impresso."""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
TF_DIR = ROOT / "deploy/terraform/dns"
HOSTS = {"apex": "victorpersike.dev.br", "www": "www.victorpersike.dev.br"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["plan", "apply"])
    args = parser.parse_args()
    os.umask(0o077)
    env = os.environ.copy()
    if not env.get("CLOUDFLARE_API_TOKEN"):
        secret = json.loads(subprocess.check_output([
            "kubectl", "-n", "traefik", "get", "secret", "cloudflare-dns", "-o", "json"
        ]))
        env["CLOUDFLARE_API_TOKEN"] = base64.b64decode(
            secret["data"]["CF_DNS_API_TOKEN"]
        ).decode()

    def cloudflare(path):
        request = urllib.request.Request(
            "https://api.cloudflare.com/client/v4" + path,
            headers={"Authorization": "Bearer " + env["CLOUDFLARE_API_TOKEN"]},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
        if not result.get("success"):
            raise RuntimeError("Consulta Cloudflare falhou")
        return result["result"]

    def terraform(*command, capture=False):
        return subprocess.run(
            ["terraform", f"-chdir={TF_DIR}", *command],
            env=env, text=True, check=True,
            stdout=subprocess.PIPE if capture else None,
        )

    if args.action == "apply":
        if not (TF_DIR / "dns.tfplan").is_file():
            raise SystemExit("Execute plan e revise o resultado antes de apply.")
        terraform("apply", "-input=false", "dns.tfplan")
        return

    zones = cloudflare("/zones?" + urllib.parse.urlencode({"name": HOSTS["apex"]}))
    if len(zones) != 1:
        raise SystemExit("Zona ausente ou ambígua; nenhum DNS alterado.")
    zone_id = zones[0]["id"]
    env["TF_VAR_zone_id"] = zone_id
    records = {}
    for key, hostname in HOSTS.items():
        found = cloudflare(f"/zones/{zone_id}/dns_records?" + urllib.parse.urlencode({"name": hostname}))
        addresses = [record for record in found if record["type"] in {"A", "AAAA", "CNAME"}]
        if len(addresses) != 1 or addresses[0]["type"] != "A":
            raise SystemExit(f"{hostname}: esperado exatamente um A existente; revisar antes de importar.")
        records[key] = addresses[0]
        print(f"{hostname}: A {addresses[0]['content']}, proxied={addresses[0]['proxied']}", flush=True)

    terraform("init", "-input=false")
    existing = set()
    if (TF_DIR / "terraform.tfstate").exists():
        existing = set(terraform("state", "list", capture=True).stdout.splitlines())
    for key, record in records.items():
        address = f'cloudflare_record.site["{key}"]'
        if address not in existing:
            terraform("import", "-input=false", address, f"{zone_id}/{record['id']}")
    terraform("validate")
    (TF_DIR / "dns.tfplan").unlink(missing_ok=True)
    terraform("plan", "-input=false", "-out=dns.tfplan")
    plan = json.loads(terraform("show", "-json", "dns.tfplan", capture=True).stdout)
    for change in plan.get("resource_changes", []):
        if "delete" in change["change"]["actions"]:
            (TF_DIR / "dns.tfplan").unlink()
            raise SystemExit("Plano recusado: contém exclusão ou substituição de DNS.")


if __name__ == "__main__":
    main()
