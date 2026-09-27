# RWD + Perf Stage 1 Tasks

## Phase 0：準備
- [ ] Create implementation_plan.md + task.md（done）
- [ ] **使用者確認 plan**（gate，沒確認不能往下）
- [ ] 開新分支 `feat/rwd-and-font-subset`
- [ ] 啟 dev server (npm run dev)
- [ ] mkdir -p .rwd-baseline/{before,after}
- [ ] .rwd-baseline 加到 .gitignore

## Phase 1：基礎建設
- [ ] [BASELINE] 用 chrome-devtools MCP 截 25 張 before 截圖
- [ ] 視覺檢視 baseline，列出每頁壞掉的問題清單（dump 到 `.rwd-baseline/issues.md`）
- [ ] [NEW] src/styles/rwd.css 加 breakpoint 變數 + container utility
- [ ] [MODIFY] global.css 加 mobile-first base font-size + box-sizing reset
- [ ] commit: `feat(rwd): add base utility + mobile-first global.css`

## Phase 2：逐頁修 RWD
- [ ] [index] 修頂部 hero 區塊（1013 行裡找到 hero，調 mobile padding）
- [ ] [index] 修中段卡片 grid → 手機單欄
- [ ] [index] 修 dex-portrait 浮動小卡 → 手機改正常 block
- [ ] [index] 修 footer / CTA 區塊手機溢出
- [ ] commit: `feat(rwd): index.astro mobile breakpoints`
- [ ] [about] 修頂部介紹區
- [ ] [about] 修經歷時間軸（直立 → 手機保留直立）
- [ ] [about] 修數據卡片 grid
- [ ] commit: `feat(rwd): about.astro mobile breakpoints`
- [ ] [coaching] 修方案卡片 grid（3 欄 → 手機 1 欄）
- [ ] [coaching] 修 FAQ 區
- [ ] [blog/index] 補手機 list spacing
- [ ] [BlogPost] 修文章內頁字級、行距、圖片
- [ ] commit: `feat(rwd): coaching + blog + BlogPost layout`

## Phase 3：Perf Stage 1（字型 subset）
- [ ] 下載 Noto Sans TC + Noto Serif TC subset（zh-TW + Latin）
- [ ] [NEW] public/fonts/ 放 woff2 檔
- [ ] [MODIFY] BaseHead.astro 換成 self-host @font-face
- [ ] 移除 fonts.googleapis.com preload / preconnect
- [ ] 保留 dns-prefetch（其他外部）
- [ ] 本機 build 確認字型載入正常
- [ ] commit: `perf: self-host font subset (Noto Sans/Serif TC)`

## Phase 4：驗證
- [ ] [SCREENSHOT] 用 chrome-devtools MCP 截 25 張 after 截圖
- [ ] 對比 before/after，確認桌機 1440px 視覺 100% 不變
- [ ] 確認手機（375/390/430）所有頁面無溢出、無破版
- [ ] iPad (768) 確認斷點切換正常
- [ ] npm run build 過
- [ ] Push 到 main、Cloudflare Pages 部署
- [ ] 等部署完，跑 psi.py 看 Perf 分數
- [ ] commit: 已逐個區塊 commit 完，最後不需 final commit
- [ ] 寫 walkthrough.md 記錄關鍵決策

## Phase 5：收尾
- [ ] 更新 HANDOFF-2026-04-29.md 標記 RWD + Perf Stage 1 完成
- [ ] 更新 memory（post-migration-status.md）
- [ ] 移除 implementation_plan.md / task.md（或標記完成存 archive）
