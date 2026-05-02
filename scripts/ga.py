#!/usr/bin/env python3
"""GA4 CLI — Google Analytics 4 Data API.

Usage:
  python3 scripts/ga.py realtime                   # 即時 active users
  python3 scripts/ga.py traffic [days]             # 過去 N 天總流量（預設 7）
  python3 scripts/ga.py top-pages [days] [limit]   # Top 頁面（預設 28d, 10 條）
  python3 scripts/ga.py top-queries [days] [limit] # Top 流量來源（搜尋詞 / 連結）
  python3 scripts/ga.py countries [days]           # 國家分布
  python3 scripts/ga.py devices [days]             # 裝置分布
  python3 scripts/ga.py compare <recent> <baseline> # 對比兩個時段
  python3 scripts/ga.py daily [days]               # 每日趨勢
"""
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

PROPERTY_ID = "434297265"
SCOPES = [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
]
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE, ".gsc", "token.json")


def get_creds():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
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
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def run_report(body):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport"
    return api("POST", url, body)


def run_realtime(body):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runRealtimeReport"
    return api("POST", url, body)


def cmd_realtime():
    code, d = run_realtime({"metrics": [{"name": "activeUsers"}]})
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    active = rows[0]["metricValues"][0]["value"] if rows else "0"
    print(f"=== Realtime (now) ===")
    print(f"  Active users: {active}")


def cmd_traffic(days=7):
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "metrics": [
            {"name": "sessions"},
            {"name": "activeUsers"},
            {"name": "screenPageViews"},
            {"name": "bounceRate"},
            {"name": "averageSessionDuration"},
        ],
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    if not rows:
        print(f"=== 過去 {days} 天 ===\n  (無數據)")
        return
    m = rows[0]["metricValues"]
    print(f"=== 過去 {days} 天總覽 ===")
    print(f"  Sessions:        {m[0]['value']}")
    print(f"  Active users:    {m[1]['value']}")
    print(f"  Page views:      {m[2]['value']}")
    print(f"  Bounce rate:     {float(m[3]['value'])*100:.1f}%")
    avg_sec = float(m[4]["value"])
    print(f"  Avg session:     {avg_sec:.0f}s ({avg_sec/60:.1f}min)")


def cmd_top_pages(days=28, limit=10):
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "pagePath"}],
        "metrics": [
            {"name": "screenPageViews"},
            {"name": "activeUsers"},
            {"name": "averageSessionDuration"},
        ],
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": int(limit),
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    print(f"=== 過去 {days} 天 Top {limit} pages ===")
    print(f"  {'Views':>6} {'Users':>6} {'AvgDur':>7}  Path")
    print(f"  {'-'*6} {'-'*6} {'-'*7}  {'-'*60}")
    for r in rows:
        path = r["dimensionValues"][0]["value"][:60]
        m = r["metricValues"]
        views = m[0]["value"]
        users = m[1]["value"]
        dur = float(m[2]["value"])
        print(f"  {views:>6} {users:>6} {dur:>6.0f}s  {path}")


def cmd_top_queries(days=28, limit=10):
    """Top traffic sources (referrer / search term)."""
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "sessionSource"}, {"name": "sessionMedium"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": int(limit),
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    print(f"=== 過去 {days} 天 Top {limit} 流量來源 ===")
    print(f"  {'Sess':>5} {'Users':>6}  {'Source':<25} {'Medium':<15}")
    print(f"  {'-'*5} {'-'*6}  {'-'*25} {'-'*15}")
    for r in rows:
        src = r["dimensionValues"][0]["value"][:25]
        med = r["dimensionValues"][1]["value"][:15]
        m = r["metricValues"]
        print(f"  {m[0]['value']:>5} {m[1]['value']:>6}  {src:<25} {med:<15}")


def cmd_countries(days=28):
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "country"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 10,
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    print(f"=== 過去 {days} 天國家分布 ===")
    for r in rows:
        country = r["dimensionValues"][0]["value"]
        m = r["metricValues"]
        print(f"  {m[0]['value']:>5} sessions, {m[1]['value']:>5} users — {country}")


def cmd_devices(days=28):
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "deviceCategory"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "screenPageViews"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    total = sum(int(r["metricValues"][0]["value"]) for r in rows)
    print(f"=== 過去 {days} 天裝置分布 ===")
    for r in rows:
        device = r["dimensionValues"][0]["value"]
        m = r["metricValues"]
        sess = int(m[0]["value"])
        pct = (sess / total * 100) if total else 0
        print(f"  {sess:>5} ({pct:>4.1f}%)  {device:<10}  Users: {m[1]['value']}, PV: {m[2]['value']}")


def cmd_compare(days_recent, days_baseline):
    n_r = int(days_recent)
    n_b = int(days_baseline)

    def fetch(start, end):
        code, d = run_report({
            "dateRanges": [{"startDate": start, "endDate": end}],
            "metrics": [
                {"name": "sessions"},
                {"name": "activeUsers"},
                {"name": "screenPageViews"},
                {"name": "bounceRate"},
            ],
        })
        rows = d.get("rows", [])
        if not rows:
            return {"sessions": 0, "users": 0, "views": 0, "bounce": 0}
        m = rows[0]["metricValues"]
        return {
            "sessions": int(m[0]["value"]),
            "users": int(m[1]["value"]),
            "views": int(m[2]["value"]),
            "bounce": float(m[3]["value"]) * 100,
        }

    r = fetch(f"{n_r}daysAgo", "today")
    # baseline: from 2x ago to N+1 ago
    b = fetch(f"{n_r + n_b}daysAgo", f"{n_r + 1}daysAgo")
    print(f"=== 對比 ===")
    print(f"  Recent:   過去 {n_r} 天")
    print(f"  Baseline: 之前 {n_b} 天")
    print()
    print(f"  {'Metric':<15} {'Recent':>10} {'Baseline':>10} {'Δ':>10}  {'%':>7}")
    print(f"  {'-'*15} {'-'*10} {'-'*10} {'-'*10}  {'-'*7}")
    for k, label in [("sessions", "Sessions"), ("users", "Users"),
                     ("views", "Page Views"), ("bounce", "Bounce %")]:
        rv = r[k]
        bv = b[k]
        diff = rv - bv
        pct = (diff / bv * 100) if bv else 0
        if k == "bounce":
            print(f"  {label:<15} {rv:>9.1f}% {bv:>9.1f}% {diff:>+9.1f}%  {pct:>+6.1f}%")
        else:
            print(f"  {label:<15} {rv:>10} {bv:>10} {diff:>+10}  {pct:>+6.1f}%")


def cmd_daily(days=14):
    code, d = run_report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "date"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "screenPageViews"}],
        "orderBys": [{"dimension": {"dimensionName": "date"}}],
    })
    if code != 200:
        print(f"❌ {code}: {d}")
        return
    rows = d.get("rows", [])
    print(f"=== 過去 {days} 天每日趨勢 ===")
    print(f"  {'Date':<10} {'Sessions':>8} {'Users':>6} {'Views':>6}")
    for r in rows:
        date = r["dimensionValues"][0]["value"]
        date_fmt = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
        m = r["metricValues"]
        print(f"  {date_fmt:<10} {m[0]['value']:>8} {m[1]['value']:>6} {m[2]['value']:>6}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "realtime":
        cmd_realtime()
    elif cmd == "traffic":
        cmd_traffic(args[1] if len(args) >= 2 else 7)
    elif cmd == "top-pages":
        cmd_top_pages(
            args[1] if len(args) >= 2 else 28,
            args[2] if len(args) >= 3 else 10,
        )
    elif cmd == "top-queries":
        cmd_top_queries(
            args[1] if len(args) >= 2 else 28,
            args[2] if len(args) >= 3 else 10,
        )
    elif cmd == "countries":
        cmd_countries(args[1] if len(args) >= 2 else 28)
    elif cmd == "devices":
        cmd_devices(args[1] if len(args) >= 2 else 28)
    elif cmd == "compare" and len(args) >= 3:
        cmd_compare(args[1], args[2])
    elif cmd == "daily":
        cmd_daily(args[1] if len(args) >= 2 else 14)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
