#!/usr/bin/env python3
"""GSC CLI — list/submit/delete sitemaps, URL inspection, search analytics.

Usage:
  python3 scripts/gsc.py auth                                       # 跑 OAuth (第一次)
  python3 scripts/gsc.py list-sites                                 # 列出可存取的 GSC properties
  python3 scripts/gsc.py list-sitemaps                              # 看當前 sitemap
  python3 scripts/gsc.py submit <url>                               # submit sitemap
  python3 scripts/gsc.py delete <url>                               # remove sitemap
  python3 scripts/gsc.py inspect <url>                              # URL inspection
  python3 scripts/gsc.py performance [days] [dim]                   # search analytics 表
                                                                     # days: 預設 28、可填 7/28/90/180
                                                                     # dim:  query (default) / page / device / country / date
  python3 scripts/gsc.py compare <days_recent> <days_baseline>      # 對比兩個時間段（搬遷影響）
"""
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
]
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRED_FILE = os.path.join(BASE, ".gsc", "client_secret.json")
TOKEN_FILE = os.path.join(BASE, ".gsc", "token.json")
SITE = "sc-domain:daydreamdex.com"


def get_creds():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CRED_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def api(method, url, body=None):
    creds = get_creds()
    headers = {"Authorization": f"Bearer {creds.token}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read()
        return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def cmd_list_sites():
    code, data = api("GET", "https://www.googleapis.com/webmasters/v3/sites")
    print("=== GSC properties ===")
    for s in data.get("siteEntry", []):
        print(f"  {s['siteUrl']:<50} permission={s['permissionLevel']}")


def cmd_list_sitemaps():
    site = urllib.parse.quote(SITE, safe="")
    code, data = api("GET", f"https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps")
    print(f"=== {SITE} sitemaps ===")
    sms = data.get("sitemap", [])
    if not sms:
        print("  (無)")
        return
    for sm in sms:
        print(f"  {sm['path']}")
        print(f"    lastSubmitted: {sm.get('lastSubmitted','never')}")
        print(f"    warnings={sm.get('warnings','0')}  errors={sm.get('errors','0')}")
        for c in sm.get("contents", []):
            print(f"    submitted={c.get('submitted','?')}  indexed={c.get('indexed','?')}")


def cmd_submit(url):
    site = urllib.parse.quote(SITE, safe="")
    smurl = urllib.parse.quote(url, safe="")
    code, data = api("PUT", f"https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps/{smurl}")
    print(f"✅ Submitted: {url}" if code in (200, 204) else f"❌ {code}: {data}")


def cmd_delete(url):
    site = urllib.parse.quote(SITE, safe="")
    smurl = urllib.parse.quote(url, safe="")
    code, data = api("DELETE", f"https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps/{smurl}")
    print(f"🗑  Deleted: {url}" if code in (200, 204) else f"❌ {code}: {data}")


def cmd_performance(days=28, dim="query", row_limit=50):
    """Pull search analytics for last N days, grouped by dimension."""
    from datetime import date, timedelta
    end = date.today() - timedelta(days=2)  # GSC data 2 天延遲
    start = end - timedelta(days=int(days))
    site = urllib.parse.quote(SITE, safe="")
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": [dim],
        "rowLimit": int(row_limit),
    }
    code, data = api(
        "POST",
        f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
        body=body,
    )
    if code != 200:
        print(f"❌ {code}: {data}")
        return
    rows = data.get("rows", [])
    print(f"=== {SITE} | {start} → {end} ({days} days) | by {dim} ===")
    print(f"  total rows: {len(rows)}")
    print()
    print(f"  {dim:<50} {'Clicks':>8} {'Impr':>8} {'CTR':>7} {'Pos':>6}")
    print(f"  {'-'*50} {'-'*8} {'-'*8} {'-'*7} {'-'*6}")
    total_clicks, total_impr = 0, 0
    for r in rows:
        key = r["keys"][0][:50]
        clicks = r["clicks"]
        impr = r["impressions"]
        ctr = r["ctr"] * 100
        pos = r["position"]
        total_clicks += clicks
        total_impr += impr
        print(f"  {key:<50} {clicks:>8} {impr:>8} {ctr:>6.2f}% {pos:>6.2f}")
    avg_ctr = (total_clicks / total_impr * 100) if total_impr else 0
    print(f"  {'TOTAL':<50} {total_clicks:>8} {total_impr:>8} {avg_ctr:>6.2f}%")


def cmd_compare(days_recent, days_baseline):
    """Compare last N days vs prior N days (e.g. 7 vs 7, or 28 vs 28)."""
    from datetime import date, timedelta
    n_recent = int(days_recent)
    n_baseline = int(days_baseline)
    end = date.today() - timedelta(days=2)
    recent_start = end - timedelta(days=n_recent)
    baseline_end = recent_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=n_baseline)
    site = urllib.parse.quote(SITE, safe="")

    def fetch(s, e):
        body = {"startDate": s.isoformat(), "endDate": e.isoformat(), "dimensions": []}
        code, d = api(
            "POST",
            f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
            body=body,
        )
        if code != 200:
            return None
        rows = d.get("rows", [])
        if not rows:
            return {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}
        r = rows[0]
        return {
            "clicks": r["clicks"],
            "impressions": r["impressions"],
            "ctr": r["ctr"] * 100,
            "position": r["position"],
        }

    r_recent = fetch(recent_start, end)
    r_baseline = fetch(baseline_start, baseline_end)
    if not r_recent or not r_baseline:
        print("❌ 拉取失敗")
        return
    print(f"=== {SITE} 對比 ===")
    print(f"  Recent  : {recent_start} → {end} ({n_recent}d)")
    print(f"  Baseline: {baseline_start} → {baseline_end} ({n_baseline}d)")
    print()
    print(f"  {'Metric':<15} {'Recent':>10} {'Baseline':>10} {'Δ':>10}  {'%':>7}")
    print(f"  {'-'*15} {'-'*10} {'-'*10} {'-'*10}  {'-'*7}")
    for k in ["clicks", "impressions", "ctr", "position"]:
        rv = r_recent[k]
        bv = r_baseline[k]
        diff = rv - bv
        pct = (diff / bv * 100) if bv else 0
        suffix = "%" if k == "ctr" else ""
        if k == "ctr":
            print(f"  {k:<15} {rv:>9.2f}{suffix} {bv:>9.2f}{suffix} {diff:>+9.2f}{suffix}  {pct:>+6.1f}%")
        elif k == "position":
            print(f"  {k:<15} {rv:>10.2f} {bv:>10.2f} {diff:>+10.2f}  {pct:>+6.1f}%")
        else:
            print(f"  {k:<15} {rv:>10.0f} {bv:>10.0f} {diff:>+10.0f}  {pct:>+6.1f}%")


def cmd_inspect(url):
    code, data = api("POST", "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                     body={"inspectionUrl": url, "siteUrl": SITE})
    if code != 200:
        print(f"❌ {code}: {data}")
        return
    r = data.get("inspectionResult", {})
    idx = r.get("indexStatusResult", {})
    print(f"=== {url} ===")
    print(f"  verdict:           {idx.get('verdict','?')}")
    print(f"  coverage:          {idx.get('coverageState','?')}")
    print(f"  robotsTxt:         {idx.get('robotsTxtState','?')}")
    print(f"  indexing:          {idx.get('indexingState','?')}")
    print(f"  lastCrawl:         {idx.get('lastCrawlTime','never')}")
    print(f"  crawledAs:         {idx.get('crawledAs','?')}")
    print(f"  userCanonical:     {idx.get('userCanonical','?')}")
    print(f"  googleCanonical:   {idx.get('googleCanonical','?')}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "auth":
        get_creds()
        print("✅ Token saved to .gsc/token.json")
    elif cmd == "list-sites":
        cmd_list_sites()
    elif cmd == "list-sitemaps":
        cmd_list_sitemaps()
    elif cmd == "submit" and len(args) >= 2:
        cmd_submit(args[1])
    elif cmd == "delete" and len(args) >= 2:
        cmd_delete(args[1])
    elif cmd == "inspect" and len(args) >= 2:
        cmd_inspect(args[1])
    elif cmd == "performance":
        days = args[1] if len(args) >= 2 else "28"
        dim = args[2] if len(args) >= 3 else "query"
        row_limit = args[3] if len(args) >= 4 else "50"
        cmd_performance(days, dim, row_limit)
    elif cmd == "compare" and len(args) >= 3:
        cmd_compare(args[1], args[2])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
