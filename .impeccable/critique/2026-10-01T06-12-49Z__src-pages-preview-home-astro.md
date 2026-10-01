---
target: 預覽首頁 /preview/home
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
target_identity: "file:/Users/dex/blog/migration/astro-site/src/pages/preview/home.astro"
target_fingerprint: "sha256:94ab8c06f2889fb0d99abf5892861547a3322b2c6a67c466534adde081114b61"
target_path: /Users/dex/blog/migration/astro-site/src/pages/preview/home.astro
timestamp: 2026-10-01T06-12-49Z
slug: src-pages-preview-home-astro
---
# Critique: /preview/home (2026-10-01) — Method: dual-agent
Score 19/32 (59%, Acceptable). n/a: 7, 10.
| # | Heuristic | Score | Key issue |
|1|System status|2|fake "正在播放"/NOW PLAYING; filters lack aria-pressed|
|2|Real world|3|English cinema labels + "DE" jargon for students|
|3|Control|3|paid booking opens SimplyBook new tab unannounced|
|4|Consistency|2|50 vs 60 min; two lead-magnet names; FINAL SCENE twice|
|5|Error prevention|2|org "free 30-min" links to personal 15-min Calendly|
|6|Recognition|3|reviews/podcast/newsletter missing from nav|
|8|Aesthetic/minimal|1|hero 11 blocks; 13 sections; too many pull quotes|
|9|Error recovery|3|subscriber-count fallback OK|
Specificity: skin authored (clapper w/ live count, 三幕劇, call sheets, ADMIT ONE reviews, career reel); skeleton is creator-landing template; cinema labels overused as costume.
Detector: CLI 1 (em-dash 59). Overlay 76@1440 / 69@390: undersized text (nav-no 10px functional), low contrast (warm 「快」2.96, nav-no 2.67, post-tag 4.2), 37 tap targets <44px @390, hero CTAs below fold (1124px/1478px). FPs: ticket/clapper micro-labels, film-strip scroll edge, collapsed menu occlusion.
P0 org free CTA wrong + no B2B exit at end (clarify)
P1 hero overload, mobile thesis below fold (distill, adapt)
P1 booking reassurance + contradictions; fake read times (clarify)
P2 IA order & length: B2B content to /consultant, archive → latest 5, shorts → /reviews (distill, layout)
P2 a11y/mobile: 44px targets, focus-visible, reduced-motion on .rec, contrast fixes, acts SVG cropped @390 (audit, adapt)
Personas: Jordan (jargon, 3 similar CTAs), Riley (50/60, fake read time, fake now playing, inferTag misclassifies), Casey (27k px page, cropped SVG, no newsletter shortcut on mobile).
Minor: floating CTA pops at 5s over hero; 3 newsletter entries; alt duplicates h3; TAKE 10 meaningless; stale "明體" comment.
Questions: single conversion audience? drop English labels? does page behavior contradict 慢慢走?
