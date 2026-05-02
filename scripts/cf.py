#!/usr/bin/env python3
"""Cloudflare CLI — DNS / Pages / Zone management via API token.

Usage:
  python3 scripts/cf.py verify                              # 確認 token 有效
  python3 scripts/cf.py dns-list                            # 列所有 DNS records
  python3 scripts/cf.py dns-add <type> <name> <content> [proxied]  # 加 DNS record
                                                            # type: A/CNAME/TXT/MX
                                                            # proxied: true/false (預設 false)
  python3 scripts/cf.py dns-delete <id>                     # 刪 DNS record
  python3 scripts/cf.py pages-list                          # 列 Pages projects
  python3 scripts/cf.py pages-deployments                   # 列最近 deployments
  python3 scripts/cf.py pages-domains                       # 列 custom domains
  python3 scripts/cf.py pages-domain-add <name>             # 加 custom domain
  python3 scripts/cf.py zone-info                           # 看 zone 設定
"""
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE, ".gsc", "cf-token.txt")

ZONE_ID = "ed2268738ad89ef46b77c5e6afeae00b"  # daydreamdex.com
ACCOUNT_ID = "5120171c9a2fb3e9a5bf3f02e74bd621"  # Lu791019@gmail.com
PROJECT_NAME = "daydreamdex-astro"


def load_token():
    if not os.path.exists(TOKEN_FILE):
        print(f"❌ CF token not found: {TOKEN_FILE}")
        sys.exit(1)
    with open(TOKEN_FILE) as f:
        return f.read().strip()


def api(method, url, body=None):
    token = load_token()
    headers = {"Authorization": f"Bearer {token}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def cmd_verify():
    code, d = api("GET", "https://api.cloudflare.com/client/v4/user/tokens/verify")
    if d.get("success"):
        r = d.get("result", {})
        print(f"✅ Token 有效")
        print(f"   ID:     {r.get('id')}")
        print(f"   Status: {r.get('status')}")
    else:
        print(f"❌ {d.get('errors')}")


def cmd_dns_list():
    code, d = api("GET",
                  f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records?per_page=100")
    if not d.get("success"):
        print(f"❌ {d.get('errors')}")
        return
    records = d.get("result", [])
    print(f"=== daydreamdex.com DNS records ({len(records)} 筆）===")
    print(f"  {'Type':<6} {'Proxy':<7} {'Name':<40} → {'Content':<50} ID")
    print(f"  {'-'*6} {'-'*7} {'-'*40} → {'-'*50} {'-'*8}")
    for r in sorted(records, key=lambda x: (x["type"], x["name"])):
        proxy = "🟠" if r.get("proxied") else "⚪"
        print(f"  {r['type']:<6} {proxy:<7} {r['name'][:40]:<40} → {r['content'][:50]:<50} {r['id'][:8]}")


def cmd_dns_add(rtype, name, content, proxied="false"):
    body = {
        "type": rtype.upper(),
        "name": name,
        "content": content,
        "ttl": 1,  # auto
        "proxied": proxied.lower() == "true",
    }
    code, d = api("POST",
                  f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records",
                  body=body)
    if d.get("success"):
        r = d.get("result", {})
        print(f"✅ Added {rtype} {name} → {content} (id: {r.get('id')[:8]})")
    else:
        print(f"❌ {d.get('errors')}")


def cmd_dns_delete(rid):
    code, d = api("DELETE",
                  f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records/{rid}")
    if d.get("success"):
        print(f"🗑  Deleted {rid}")
    else:
        print(f"❌ {d.get('errors')}")


def cmd_pages_list():
    code, d = api("GET",
                  f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects")
    if not d.get("success"):
        print(f"❌ {d.get('errors')}")
        return
    print("=== Pages projects ===")
    for p in d.get("result", []):
        print(f"  {p['name']}")
        print(f"    domains: {p.get('domains', [])}")
        print(f"    production_branch: {p.get('production_branch')}")


def cmd_pages_deployments(limit=10):
    code, d = api("GET",
                  f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments?per_page={limit}")
    if not d.get("success"):
        print(f"❌ {d.get('errors')}")
        return
    print(f"=== {PROJECT_NAME} 最近 {limit} 筆 deployments ===")
    print(f"  {'ID':<10} {'Stage':<10} {'Status':<10} {'Branch':<8} {'Commit':<10} {'Created'}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*8} {'-'*10} {'-'*25}")
    for dep in d.get("result", []):
        stage = dep.get("latest_stage", {}).get("name", "?")
        status = dep.get("latest_stage", {}).get("status", "?")
        commit = dep.get("deployment_trigger", {}).get("metadata", {}).get("commit_hash", "?")[:7]
        branch = dep.get("deployment_trigger", {}).get("metadata", {}).get("branch", "?")
        print(f"  {dep['id'][:8]}.. {stage:<10} {status:<10} {branch:<8} {commit:<10} {dep.get('created_on','')[:19]}")


def cmd_pages_domains():
    code, d = api("GET",
                  f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/domains")
    if not d.get("success"):
        print(f"❌ {d.get('errors')}")
        return
    print(f"=== {PROJECT_NAME} custom domains ===")
    for dom in d.get("result", []):
        print(f"  {dom['name']:<35} status={dom['status']:<10} validation={dom.get('validation_data',{}).get('status','?')}")


def cmd_pages_domain_add(name):
    code, d = api("POST",
                  f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/domains",
                  body={"name": name})
    if d.get("success"):
        r = d.get("result", {})
        print(f"✅ Added domain: {r.get('name')} (status: {r.get('status')})")
    else:
        print(f"❌ {d.get('errors')}")


def cmd_zone_info():
    code, d = api("GET", f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}")
    if not d.get("success"):
        print(f"❌ {d.get('errors')}")
        return
    z = d.get("result", {})
    print(f"=== {z.get('name')} zone info ===")
    print(f"  Status:  {z.get('status')}")
    print(f"  Plan:    {z.get('plan',{}).get('name')}")
    print(f"  Type:    {z.get('type')}")
    print(f"  NS:      {z.get('name_servers')}")
    print(f"  Account: {z.get('account',{}).get('name')}")
    print(f"  Created: {z.get('created_on','')[:10]}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "verify":
        cmd_verify()
    elif cmd == "dns-list":
        cmd_dns_list()
    elif cmd == "dns-add" and len(args) >= 4:
        cmd_dns_add(args[1], args[2], args[3], args[4] if len(args) >= 5 else "false")
    elif cmd == "dns-delete" and len(args) >= 2:
        cmd_dns_delete(args[1])
    elif cmd == "pages-list":
        cmd_pages_list()
    elif cmd == "pages-deployments":
        cmd_pages_deployments(args[1] if len(args) >= 2 else 10)
    elif cmd == "pages-domains":
        cmd_pages_domains()
    elif cmd == "pages-domain-add" and len(args) >= 2:
        cmd_pages_domain_add(args[1])
    elif cmd == "zone-info":
        cmd_zone_info()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
