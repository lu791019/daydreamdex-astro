#!/usr/bin/env python3
"""Weekly Report — 整合 GSC + GA4 + PSI 一鍵看週報。

Usage:
  python3 scripts/weekly-report.py            # 預設 7 天 vs 之前 7 天
  python3 scripts/weekly-report.py 14         # 14 天 vs 之前 14 天
  python3 scripts/weekly-report.py 28 28      # 28 天 vs 之前 28 天

Output:
  - Console 印報告
  - 存 markdown 到 ../seo-baseline/weekly-reports/{date}.md
"""
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import date, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 重用 gsc.py / ga.py / psi.py 的設定
from gsc import api as gsc_api, SITE as GSC_SITE  # noqa
from ga import api as ga_api, PROPERTY_ID  # noqa
from psi import run_psi, summary as psi_summary, DEFAULT_URLS  # noqa

REPORT_DIR = os.path.join(BASE, "..", "seo-baseline", "weekly-reports")
TODAY = date.today()


def section_gsc(days=7):
    """GSC 數據 section."""
    out = []
    out.append("\n## 📊 Google Search Console")
    out.append("")

    # GSC 數據 2 天延遲
    end = TODAY - timedelta(days=2)
    start = end - timedelta(days=days)
    baseline_end = start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=days)

    site = urllib.parse.quote(GSC_SITE, safe="")

    def fetch(s, e, dims=None):
        body = {
            "startDate": s.isoformat(),
            "endDate": e.isoformat(),
            "dimensions": dims or [],
            "rowLimit": 100,
        }
        code, d = gsc_api(
            "POST",
            f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
            body=body,
        )
        return d.get("rows", []) if code == 200 else []

    # 7d vs 7d 對比
    rows_recent = fetch(start, end)
    rows_baseline = fetch(baseline_start, baseline_end)
    r = rows_recent[0] if rows_recent else {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}
    b = rows_baseline[0] if rows_baseline else {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}

    out.append(f"### 搜尋表現對比")
    out.append(f"- 最近 {days} 天: {start} → {end}")
    out.append(f"- 之前 {days} 天: {baseline_start} → {baseline_end}")
    out.append("")
    out.append(f"| Metric | Recent | Baseline | Δ |")
    out.append(f"|--------|--------|----------|---|")

    def diff_pct(recent, baseline):
        if baseline == 0:
            return "+∞%" if recent > 0 else "0%"
        return f"{(recent - baseline) / baseline * 100:+.1f}%"

    out.append(f"| Clicks | {r['clicks']} | {b['clicks']} | {diff_pct(r['clicks'], b['clicks'])} |")
    out.append(f"| Impressions | {r['impressions']} | {b['impressions']} | {diff_pct(r['impressions'], b['impressions'])} |")
    out.append(f"| CTR | {r['ctr']*100:.2f}% | {b['ctr']*100:.2f}% | {(r['ctr']-b['ctr'])*100:+.2f}pp |")
    out.append(f"| Avg position | {r['position']:.2f} | {b['position']:.2f} | {r['position']-b['position']:+.2f} |")

    # Top queries
    queries = fetch(start, end, [{"name": "query"}] if False else ["query"])
    if queries:
        out.append("")
        out.append("### Top 10 queries")
        out.append("| Query | Clicks | Impr | CTR | Pos |")
        out.append("|-------|--------|------|-----|-----|")
        for row in queries[:10]:
            q = row["keys"][0][:40]
            out.append(f"| {q} | {row['clicks']} | {row['impressions']} | {row['ctr']*100:.1f}% | {row['position']:.1f} |")

    # Top pages
    pages = fetch(start, end, ["page"])
    if pages:
        out.append("")
        out.append("### Top 10 pages")
        out.append("| Page | Clicks | Impr | CTR | Pos |")
        out.append("|------|--------|------|-----|-----|")
        for row in pages[:10]:
            p = row["keys"][0].replace("https://daydreamdex.com", "")[:50]
            out.append(f"| {p} | {row['clicks']} | {row['impressions']} | {row['ctr']*100:.1f}% | {row['position']:.1f} |")

    return "\n".join(out)


def section_gsc_coverage():
    """檢查全站 URL 索引覆蓋率."""
    out = []
    out.append("\n### URL 索引覆蓋率")

    site = urllib.parse.quote(GSC_SITE, safe="")
    # 從 sitemap 拿 URL 清單
    urls = []
    blog_dir = os.path.join(BASE, "src", "content", "blog")
    if os.path.exists(blog_dir):
        for f in os.listdir(blog_dir):
            if f.endswith(".md"):
                slug = f.replace(".md", "")
                urls.append(f"https://daydreamdex.com/blog/{slug}")
    urls.extend([
        "https://daydreamdex.com/",
        "https://daydreamdex.com/about",
        "https://daydreamdex.com/coaching",
        "https://daydreamdex.com/blog",
    ])

    counts = {"indexed": 0, "redirect_error": 0, "not_indexed": 0, "unknown": 0, "other": 0}
    statuses = {}
    for url in urls:
        code, d = gsc_api(
            "POST",
            "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
            body={"inspectionUrl": url, "siteUrl": GSC_SITE},
        )
        if code != 200:
            counts["other"] += 1
            continue
        cov = d.get("inspectionResult", {}).get("indexStatusResult", {}).get("coverageState", "?")
        statuses[url] = cov
        if "Submitted and indexed" in cov or "Indexed, not submitted" in cov:
            counts["indexed"] += 1
        elif "Redirect error" in cov:
            counts["redirect_error"] += 1
        elif "currently not indexed" in cov:
            counts["not_indexed"] += 1
        elif "unknown to Google" in cov:
            counts["unknown"] += 1
        else:
            counts["other"] += 1

    total = len(urls)
    out.append(f"")
    out.append(f"- 🟢 已索引: {counts['indexed']} / {total}")
    out.append(f"- 🔴 Redirect error: {counts['redirect_error']}")
    out.append(f"- 🟡 已抓未索引（評估中）: {counts['not_indexed']}")
    out.append(f"- ❓ Google 不知道: {counts['unknown']}")
    if counts["other"]:
        out.append(f"- ⚪ 其他: {counts['other']}")

    if counts["redirect_error"] > 0:
        out.append("")
        out.append("**⚠️ Redirect error 的 URL：**")
        for url, cov in statuses.items():
            if "Redirect error" in cov:
                out.append(f"- {url.replace('https://daydreamdex.com', '')}")

    return "\n".join(out)


def section_ga(days=7):
    """GA4 流量 section."""
    out = []
    out.append("\n## 👥 Google Analytics 4")
    out.append("")

    def report(body):
        url = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport"
        code, d = ga_api("POST", url, body)
        return d.get("rows", []) if code == 200 else []

    # 對比
    def fetch_summary(start, end_ago):
        rows = report({
            "dateRanges": [{"startDate": start, "endDate": end_ago}],
            "metrics": [
                {"name": "sessions"},
                {"name": "activeUsers"},
                {"name": "screenPageViews"},
                {"name": "bounceRate"},
            ],
        })
        if not rows:
            return {"sessions": 0, "users": 0, "views": 0, "bounce": 0}
        m = rows[0]["metricValues"]
        return {
            "sessions": int(m[0]["value"]),
            "users": int(m[1]["value"]),
            "views": int(m[2]["value"]),
            "bounce": float(m[3]["value"]) * 100,
        }

    r = fetch_summary(f"{days}daysAgo", "today")
    b = fetch_summary(f"{days*2}daysAgo", f"{days+1}daysAgo")

    out.append(f"### 流量對比（最近 {days} 天 vs 之前 {days} 天）")
    out.append("")
    out.append(f"| Metric | Recent | Baseline | Δ |")
    out.append(f"|--------|--------|----------|---|")
    for k, label in [("sessions", "Sessions"), ("users", "Active users"),
                     ("views", "Page views"), ("bounce", "Bounce rate")]:
        rv = r[k]
        bv = b[k]
        if k == "bounce":
            out.append(f"| {label} | {rv:.1f}% | {bv:.1f}% | {rv-bv:+.1f}pp |")
        else:
            pct = (rv - bv) / bv * 100 if bv else 0
            out.append(f"| {label} | {rv} | {bv} | {pct:+.1f}% |")

    # Top pages
    rows = report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "pagePath"}],
        "metrics": [{"name": "screenPageViews"}, {"name": "activeUsers"}],
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": 10,
    })
    if rows:
        out.append("")
        out.append("### Top 10 pages")
        out.append("| Path | Views | Users |")
        out.append("|------|-------|-------|")
        for row in rows:
            path = row["dimensionValues"][0]["value"][:50]
            m = row["metricValues"]
            out.append(f"| {path} | {m[0]['value']} | {m[1]['value']} |")

    # Sources
    rows = report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "sessionSource"}, {"name": "sessionMedium"}],
        "metrics": [{"name": "sessions"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 5,
    })
    if rows:
        out.append("")
        out.append("### Top 5 流量來源")
        out.append("| Source | Medium | Sessions |")
        out.append("|--------|--------|----------|")
        for row in rows:
            src = row["dimensionValues"][0]["value"]
            med = row["dimensionValues"][1]["value"]
            out.append(f"| {src} | {med} | {row['metricValues'][0]['value']} |")

    # Devices
    rows = report({
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "deviceCategory"}],
        "metrics": [{"name": "sessions"}],
    })
    if rows:
        out.append("")
        out.append("### 裝置分布")
        total = sum(int(r["metricValues"][0]["value"]) for r in rows)
        for row in rows:
            d = row["dimensionValues"][0]["value"]
            sess = int(row["metricValues"][0]["value"])
            pct = (sess / total * 100) if total else 0
            out.append(f"- {d}: {sess} ({pct:.1f}%)")

    return "\n".join(out)


def section_psi():
    """PSI 4 模式測量."""
    out = []
    out.append("\n## ⚡ PageSpeed Insights")
    out.append("")
    out.append("| URL | Strategy | Perf | LCP | CLS | Total |")
    out.append("|-----|----------|------|-----|-----|-------|")

    for url in DEFAULT_URLS:
        short = url.replace("https://daydreamdex.com", "") or "/"
        for strategy in ["mobile", "desktop"]:
            try:
                d = run_psi(url, strategy)
                s = psi_summary(d)
                out.append(f"| {short[:40]} | {strategy} | {s['perf']} | {s['lcp']} | {s['cls']} | {s['total_kb']}KB |")
            except Exception as e:
                out.append(f"| {short[:40]} | {strategy} | ❌ | {str(e)[:30]} | - | - |")

    return "\n".join(out)


def section_insights(days=7):
    """跨工具 insights."""
    return f"""
## 💡 Insights

- **GSC 數據延遲**：搜尋數據是 {(TODAY - timedelta(days=2))} 之前，最新 2 天還沒進來
- **GA 是即時**：可以對比 GA 跟 GSC 看 organic vs total 流量比例
- **下次跑**：建議每週一早上跑（看上週完整資料）

```bash
python3 scripts/weekly-report.py {days}
```
"""


def main():
    args = sys.argv[1:]
    days = int(args[0]) if args else 7

    title = f"# Weekly Report — {TODAY}\n\n**過去 {days} 天 vs 之前 {days} 天**"
    print(title)
    print("\n_Generating... this takes 2-3 minutes_\n")

    sections = []
    print("[1/4] GSC search analytics...", flush=True)
    sections.append(section_gsc(days))

    print("[2/4] GSC URL coverage...", flush=True)
    sections.append(section_gsc_coverage())

    print("[3/4] GA4 traffic...", flush=True)
    sections.append(section_ga(days))

    print("[4/4] PSI (4 模式測量, 較慢)...", flush=True)
    sections.append(section_psi())

    sections.append(section_insights(days))

    full_report = title + "\n" + "\n".join(sections)

    # 印
    print("\n" + "=" * 60)
    print(full_report)

    # 存
    os.makedirs(REPORT_DIR, exist_ok=True)
    out_path = os.path.join(REPORT_DIR, f"{TODAY}.md")
    with open(out_path, "w") as f:
        f.write(full_report)
    print(f"\n\n✅ 報告存到: {out_path}")


if __name__ == "__main__":
    main()
