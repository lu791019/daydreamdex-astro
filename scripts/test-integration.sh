#!/bin/bash
# 自動化整合測試：驗證 daydreamdex-astro.pages.dev 部署正確性
# 檢驗項：HTTP 狀態、301 redirect、SEO meta、JSON-LD、sitemap、robots.txt

BASE="https://daydreamdex-astro.pages.dev"
PASS=0
FAIL=0
FAILURES=()

pass() { PASS=$((PASS+1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL+1)); FAILURES+=("$1"); echo "  FAIL: $1"; }

# Helper: HTTP status check (follows 308 trailing-slash auto-redirect from Cloudflare)
check_status() {
  local url="$1"; local expected="$2"; local label="$3"
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -L --http1.1 "$url")
  if [ "$actual" = "$expected" ]; then
    pass "$label ($actual)"
  else
    fail "$label (expected $expected, got $actual) URL=$url"
  fi
}

# Helper: 301 redirect with Location target check
# Uses --http1.1 to bypass HTTP/2 103 Early Hints noise.
check_redirect() {
  local from="$1"; local expected_to="$2"
  local resp
  resp=$(curl -sI --http1.1 "$BASE$from")
  # Find the first non-103 status line
  local code
  code=$(echo "$resp" | grep -E "^HTTP/" | grep -v " 103 " | head -1 | awk '{print $2}')
  local loc
  loc=$(echo "$resp" | grep -i "^location:" | head -1 | awk '{print $2}' | tr -d '\r\n')
  if [ "$code" = "301" ] && [[ "$loc" == *"$expected_to"* ]]; then
    pass "redirect $from -> $expected_to (301)"
  else
    fail "redirect $from (expected 301 -> $expected_to, got code=$code loc=$loc)"
  fi
}

# Helper: HTML contains string
check_contains() {
  local url="$1"; local needle="$2"; local label="$3"
  if curl -sL "$url" | grep -q "$needle"; then
    pass "$label"
  else
    fail "$label (missing: $needle on $url)"
  fi
}

# Helper: HTML does NOT contain string
check_not_contains() {
  local url="$1"; local needle="$2"; local label="$3"
  if curl -sL "$url" | grep -q "$needle"; then
    fail "$label (UNEXPECTED match: $needle on $url)"
  else
    pass "$label"
  fi
}

echo "==============================================="
echo "Integration Test: $BASE"
echo "Date: $(date)"
echo "==============================================="

# --- 1. 主頁 + 主要 page (4 + 14 = 18 頁全 200) ---
echo ""
echo "[1] HTTP 200 for all 18 pages"
check_status "$BASE/" 200 "homepage /"
check_status "$BASE/about" 200 "/about"
check_status "$BASE/coaching" 200 "/coaching"
check_status "$BASE/blog" 200 "/blog index"

POSTS=(
  "2024-04-03-cost-of-time-in-employment-sys-3"
  "2024-04-13-my-vacation-starting"
  "2024-05-05-truely-take-a-break-off-work-3"
  "2024-06-15-nosql-compare-and-selection-2"
  "2024-06-27-python-coding-rules-guide-line-3"
  "2024-07-14-python-beginner-guide-line-self-study-strategy-with-engineer-background-2"
  "2024-07-14-three-steps-to-get-job-and-become-python-engineer"
  "2024-08-03-langchain-introduction-learning"
  "2024-08-04-python-career-transition-guide-and-experience"
  "2025-03-04-30s-career-change-5-questions-to-ask"
  "2025-03-06-how-to-become-best-data-engineer"
  "2025-03-11-software-or-machine-learning-to-ai"
  "2025-03-13-data-analyst-beginner-guide-career-switch"
  "2025-03-20-data-engineer-career-roadmap-from-skills-to-interview"
)
for slug in "${POSTS[@]}"; do
  check_status "$BASE/blog/$slug" 200 "post $slug"
done

# --- 2. 38 條 redirect ---
echo ""
echo "[2] 38 redirect rules (301 + Location)"

# WP system paths
check_redirect "/wp-admin/" "/"
check_redirect "/wp-login.php" "/"
check_redirect "/feed/" "/rss.xml"
check_redirect "/feed" "/rss.xml"
check_redirect "/sitemap_index.xml" "/sitemap-index.xml"
check_redirect "/post-sitemap.xml" "/sitemap-index.xml"
check_redirect "/page-sitemap.xml" "/sitemap-index.xml"
check_redirect "/category-sitemap.xml" "/sitemap-index.xml"
check_redirect "/local-sitemap.xml" "/sitemap-index.xml"

# 14 article redirects
check_redirect "/data-engineer-career-roadmap-from-skills-to-interview/" "/blog/2025-03-20-data-engineer-career-roadmap-from-skills-to-interview"
check_redirect "/data-analyst-beginner-guide-career-switch/" "/blog/2025-03-13-data-analyst-beginner-guide-career-switch"
check_redirect "/software-or-machine-learning-to-ai/" "/blog/2025-03-11-software-or-machine-learning-to-ai"
check_redirect "/how-to-become-best-data-engineer/" "/blog/2025-03-06-how-to-become-best-data-engineer"
check_redirect "/30s-career-change-5-questions-to-ask/" "/blog/2025-03-04-30s-career-change-5-questions-to-ask"
check_redirect "/python-career-transition-guide-and-experience/" "/blog/2024-08-04-python-career-transition-guide-and-experience"
check_redirect "/langchain-introduction-learning/" "/blog/2024-08-03-langchain-introduction-learning"
check_redirect "/three-steps-to-get-job-and-become-python-engineer/" "/blog/2024-07-14-three-steps-to-get-job-and-become-python-engineer"
check_redirect "/python-beginner-guide-line-self-study-strategy-with-engineer-background-2/" "/blog/2024-07-14-python-beginner-guide-line-self-study-strategy-with-engineer-background-2"
check_redirect "/python-coding-rules-guide-line-3/" "/blog/2024-06-27-python-coding-rules-guide-line-3"
check_redirect "/nosql-compare-and-selection-2/" "/blog/2024-06-15-nosql-compare-and-selection-2"
check_redirect "/truely-take-a-break-off-work-3/" "/blog/2024-05-05-truely-take-a-break-off-work-3"
check_redirect "/my-vacation-starting/" "/blog/2024-04-13-my-vacation-starting"
check_redirect "/cost-of-time-in-employment-sys-3/" "/blog/2024-04-03-cost-of-time-in-employment-sys-3"

# pages
check_redirect "/about-us/" "/about"
check_redirect "/story/" "/about"
check_redirect "/privacy-policy/" "/"
check_redirect "/terms/" "/"

# funnels
check_redirect "/homepage-1/" "/"
check_redirect "/homepage-2/" "/"
check_redirect "/homepage-3/" "/"
check_redirect "/salespage-1/" "/"
check_redirect "/salespage-2/" "/"
check_redirect "/sales-page-3/" "/"
check_redirect "/get/" "/"
check_redirect "/free/" "/"
check_redirect "/refund/" "/"

# wildcard category/tag (sample)
check_redirect "/category/python/" "/"
check_redirect "/tag/career/" "/"

# --- 3. SEO meta on key pages ---
echo ""
echo "[3] SEO meta tags (title / description / og:image / canonical)"
SEO_PAGES=(
  "$BASE/"
  "$BASE/about"
  "$BASE/coaching"
  "$BASE/blog/2025-03-20-data-engineer-career-roadmap-from-skills-to-interview"
)
for url in "${SEO_PAGES[@]}"; do
  check_contains "$url" "<title>" "$url has <title>"
  check_contains "$url" 'name="description"' "$url has meta description"
  check_contains "$url" 'property="og:image"' "$url has og:image"
  check_contains "$url" 'rel="canonical"' "$url has canonical"
  check_contains "$url" 'twitter:card' "$url has twitter:card"
done

# --- 4. JSON-LD schema ---
echo ""
echo "[4] JSON-LD schema (Person + WebSite on home; Article on posts)"
check_contains "$BASE/" '"@type":"Person"' "homepage Person schema"
check_contains "$BASE/" '"@type":"WebSite"' "homepage WebSite schema"
check_contains "$BASE/blog/2025-03-20-data-engineer-career-roadmap-from-skills-to-interview" '"@type":"Article"' "post has Article schema"

# --- 5. sitemap ---
echo ""
echo "[5] sitemap"
check_status "$BASE/sitemap-index.xml" 200 "sitemap-index.xml"
check_status "$BASE/sitemap-0.xml" 200 "sitemap-0.xml"
SITEMAP_URLS=$(curl -sL "$BASE/sitemap-0.xml" | grep -o "<loc>" | wc -l | tr -d ' ')
echo "  sitemap URL count: $SITEMAP_URLS"
if [ "$SITEMAP_URLS" -ge 17 ]; then
  pass "sitemap has >= 17 URLs ($SITEMAP_URLS)"
else
  fail "sitemap has < 17 URLs (got $SITEMAP_URLS)"
fi

# --- 6. robots.txt ---
echo ""
echo "[6] robots.txt"
check_status "$BASE/robots.txt" 200 "robots.txt"
check_contains "$BASE/robots.txt" "Sitemap:" "robots.txt has Sitemap directive"

# --- 7. 站長路可 audit ---
echo ""
echo "[7] No '站長路可' across key pages"
for url in "${SEO_PAGES[@]}"; do
  check_not_contains "$url" "站長路可" "$url has no 站長路可"
done

# --- 8. favicon ---
echo ""
echo "[8] favicon"
check_status "$BASE/favicon.webp" 200 "/favicon.webp"

# --- 9. RSS ---
echo ""
echo "[9] RSS"
check_status "$BASE/rss.xml" 200 "/rss.xml"

# --- Summary ---
echo ""
echo "==============================================="
echo "Summary: PASS=$PASS  FAIL=$FAIL"
echo "==============================================="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
exit 0
