#!/usr/bin/env python3
"""PSI CLI — PageSpeed Insights 自動測量。

Usage:
  python3 scripts/psi.py run <url> [strategy]    # 跑單一 URL
                                                  # strategy: mobile (default) / desktop
  python3 scripts/psi.py all                      # 跑首頁 + Top 文章 × mobile/desktop (4 個)
  python3 scripts/psi.py history                  # 看歷史紀錄
  python3 scripts/psi.py compare                  # 看最新 2 次的對比
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_FILE = os.path.join(BASE, ".gsc", "psi-key.txt")
LOG_DIR = os.path.join(BASE, "..", "seo-baseline", "psi-history")

DEFAULT_URLS = [
    "https://daydreamdex.com/",
    "https://daydreamdex.com/blog/2025-03-06-how-to-become-best-data-engineer",
]


def load_key():
    if not os.path.exists(KEY_FILE):
        print(f"❌ PSI key not found: {KEY_FILE}")
        sys.exit(1)
    with open(KEY_FILE) as f:
        return f.read().strip()


def run_psi(url, strategy="mobile"):
    key = load_key()
    encoded_url = urllib.parse.quote(url, safe="")
    api_url = (
        f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?"
        f"url={encoded_url}&strategy={strategy}"
        f"&category=performance&category=seo&category=accessibility&category=best-practices"
        f"&key={key}"
    )
    req = urllib.request.Request(api_url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def summary(d):
    lr = d.get("lighthouseResult", {})
    cats = lr.get("categories", {})
    audits = lr.get("audits", {})
    return {
        "perf": int((cats.get("performance", {}).get("score") or 0) * 100),
        "a11y": int((cats.get("accessibility", {}).get("score") or 0) * 100),
        "bp": int((cats.get("best-practices", {}).get("score") or 0) * 100),
        "seo": int((cats.get("seo", {}).get("score") or 0) * 100),
        "fcp": audits.get("first-contentful-paint", {}).get("displayValue", "?"),
        "lcp": audits.get("largest-contentful-paint", {}).get("displayValue", "?"),
        "tbt": audits.get("total-blocking-time", {}).get("displayValue", "?"),
        "cls": audits.get("cumulative-layout-shift", {}).get("displayValue", "?"),
        "si": audits.get("speed-index", {}).get("displayValue", "?"),
        "tti": audits.get("interactive", {}).get("displayValue", "?"),
        "total_kb": int(audits.get("total-byte-weight", {}).get("numericValue", 0) / 1024),
    }


def cmd_run(url, strategy):
    print(f"=== {url} | {strategy} ===")
    d = run_psi(url, strategy)
    s = summary(d)
    print(f"  Perf: {s['perf']}  A11y: {s['a11y']}  BP: {s['bp']}  SEO: {s['seo']}")
    print(f"  FCP: {s['fcp']}  LCP: {s['lcp']}  TBT: {s['tbt']}  CLS: {s['cls']}")
    print(f"  SI:  {s['si']}  TTI: {s['tti']}  Total: {s['total_kb']} KB")
    return s


def cmd_all():
    os.makedirs(LOG_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    log_path = os.path.join(LOG_DIR, f"{timestamp}.json")

    print(f"=== PSI run — {timestamp} ===")
    print()
    results = []
    for url in DEFAULT_URLS:
        short = url.replace("https://daydreamdex.com", "") or "/"
        for strategy in ["mobile", "desktop"]:
            try:
                d = run_psi(url, strategy)
                s = summary(d)
                line = (
                    f"  {short:<60} {strategy:8} "
                    f"Perf={s['perf']:>3}  LCP={s['lcp']:<8}  "
                    f"TBT={s['tbt']:<6}  CLS={s['cls']:<6}  Total={s['total_kb']}KB"
                )
                print(line)
                results.append({"url": url, "strategy": strategy, "summary": s})
            except Exception as e:
                print(f"  {short} {strategy}: ❌ {e}")
                results.append({"url": url, "strategy": strategy, "error": str(e)})

    with open(log_path, "w") as f:
        json.dump({"timestamp": timestamp, "results": results}, f, ensure_ascii=False, indent=2)
    print(f"\n  ✅ Log saved: {log_path}")


def cmd_history():
    if not os.path.exists(LOG_DIR):
        print("(no history yet)")
        return
    files = sorted([f for f in os.listdir(LOG_DIR) if f.endswith(".json")])
    if not files:
        print("(no history yet)")
        return
    for fn in files[-10:]:
        path = os.path.join(LOG_DIR, fn)
        with open(path) as f:
            d = json.load(f)
        print(f"=== {d['timestamp']} ===")
        for r in d.get("results", []):
            short = r["url"].replace("https://daydreamdex.com", "") or "/"
            if "error" in r:
                print(f"  {short:<60} {r['strategy']:8} ❌ {r['error'][:60]}")
            else:
                s = r["summary"]
                print(
                    f"  {short:<60} {r['strategy']:8} "
                    f"Perf={s['perf']:>3}  LCP={s['lcp']:<8}  Total={s['total_kb']}KB"
                )
        print()


def cmd_compare():
    if not os.path.exists(LOG_DIR):
        print("(no history)")
        return
    files = sorted([f for f in os.listdir(LOG_DIR) if f.endswith(".json")])
    if len(files) < 2:
        print(f"(need at least 2 runs, got {len(files)})")
        return
    with open(os.path.join(LOG_DIR, files[-2])) as f:
        before = json.load(f)
    with open(os.path.join(LOG_DIR, files[-1])) as f:
        after = json.load(f)

    print(f"=== Compare ===")
    print(f"  Before: {before['timestamp']}")
    print(f"  After:  {after['timestamp']}")
    print()

    def index_results(d):
        return {(r["url"], r["strategy"]): r for r in d.get("results", [])}

    before_idx = index_results(before)
    after_idx = index_results(after)

    for key in after_idx:
        url, strategy = key
        short = url.replace("https://daydreamdex.com", "") or "/"
        b = before_idx.get(key, {}).get("summary")
        a = after_idx.get(key, {}).get("summary")
        if not (b and a):
            continue
        diff_perf = a["perf"] - b["perf"]
        diff_kb = a["total_kb"] - b["total_kb"]
        arrow = "↑" if diff_perf > 0 else ("↓" if diff_perf < 0 else "=")
        print(f"  {short:<55} {strategy:8}")
        print(
            f"    Perf:  {b['perf']:>3} → {a['perf']:>3}  {arrow}{abs(diff_perf):>3}"
        )
        print(f"    LCP:   {b['lcp']:<10} → {a['lcp']:<10}")
        print(f"    Total: {b['total_kb']} KB → {a['total_kb']} KB  ({diff_kb:+d} KB)")
        print()


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "run" and len(args) >= 2:
        url = args[1]
        strategy = args[2] if len(args) >= 3 else "mobile"
        cmd_run(url, strategy)
    elif cmd == "all":
        cmd_all()
    elif cmd == "history":
        cmd_history()
    elif cmd == "compare":
        cmd_compare()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
