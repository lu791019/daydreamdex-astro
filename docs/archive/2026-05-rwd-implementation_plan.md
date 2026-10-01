# RWD + Perf Stage 1 Implementation Plan

> 任務：把 daydreamdex.com 修成各尺寸手機都能正常顯示，並順手做 Perf Stage 1（字型 self-host subset）。
> 風格憲章：**只調 layout（spacing / grid / 字級 scale）**，不動 B Warm 視覺風格（色彩 / 字型 / 電影元素）。

---

## Goal Description

1. **RWD 修正**：所有頁面在 5 個關鍵 breakpoint 都正常顯示（無溢出、無破版、無重疊）
2. **Perf Stage 1**：字型 self-host + subset，移除 fonts.googleapis.com 外部請求（PSI Mobile +10-15）

## User Review Required

> **NOTE**
> 1. 整站只有 1 個 @media query（`global.css`），其餘 0 個 → 是「desktop-only」設計
> 2. 不能動視覺風格（B Warm），只調 layout 系統
> 3. 採用 mobile-first 心法：基礎 style = 手機，桌機用 min-width media query 加強
> 4. 用 mcp__chrome-devtools 工具自動截圖驗證（baseline → 修 → re-screenshot）
> 5. **此 plan 寫完後等使用者確認才動手**

---

## Method（怎麼測試和驗證）

### Test Matrix

5 breakpoints × 5 pages = **25 baseline screenshots**

| 尺寸 | 代表機 | 用途 |
|------|--------|------|
| 375px | iPhone SE / 13 mini | 最小手機 |
| 390px | iPhone 14/15 | 主流 |
| 430px | iPhone Pro Max | 大手機 |
| 768px | iPad portrait | 平板直 |
| 1024px+ | iPad landscape / Desktop | 桌機 baseline |

| 頁面 | 路徑 | 行數 |
|------|------|------|
| 首頁 | `/` | 1013 |
| About | `/about` | 737 |
| Coaching | `/coaching` | 459 |
| 文章列表 | `/blog` | ? |
| 文章內頁 | `/blog/{slug}` | 287 (layout) |

### Workflow

```
1. 啟 dev server (npm run dev → localhost:4321)
2. mcp__chrome-devtools__new_page 開瀏覽器
3. 對每個 (breakpoint × page) 跑：
   - resize_page → 設定 viewport
   - navigate_page → 載入頁面
   - take_screenshot → 存到 .rwd-baseline/{page}-{width}.png
4. 看 baseline 找問題（人工 + 我列清單）
5. 修（CSS Grid / Flex / clamp() / max-width / @media）
6. 重跑步驟 3 → 對比 baseline → 驗證
```

### 截圖存放

```
/Users/dex/blog/migration/astro-site/.rwd-baseline/
  ├── before/
  │   ├── home-375.png
  │   ├── home-390.png
  │   └── ...
  └── after/
      ├── home-375.png
      └── ...
```

---

## Proposed Changes

### Phase 1：建立 RWD utility 系統（基礎）

- `[NEW] src/styles/rwd.css`
  全站共用的 breakpoint 變數 + utility（container width、grid scale、字級 clamp）
  匯入到 `BaseHead.astro` 或 `global.css`

- `[MODIFY] src/styles/global.css`
  加 mobile-first base：`html { font-size: clamp(14px, 1vw + 13px, 16px); }`
  加常用 breakpoint：`@media (min-width: 768px)`、`@media (min-width: 1024px)`

### Phase 2：逐頁修 RWD（不動視覺）

- `[MODIFY] src/pages/index.astro` (1013 lines, 11 區塊)
  加 inline `@media` 包覆 desktop grid / spacing
  把固定寬度（如 `width: 800px`）改成 `max-width: 800px; width: 100%`
  把 multi-column grid 在手機改成單欄

- `[MODIFY] src/pages/about.astro` (737 lines)
  同上策略

- `[MODIFY] src/pages/coaching.astro` (459 lines)
  同上策略

- `[MODIFY] src/pages/blog/index.astro`
  已有 1 個 @media，補齊其他斷點

- `[MODIFY] src/layouts/BlogPost.astro`
  文章內頁字級 / 行距 / 圖片寬度 RWD

### Phase 3：Perf Stage 1（字型 subset）

- `[NEW] public/fonts/`
  下載 Noto Sans TC + Noto Serif TC subset（只含繁中常用 ~6000 字 + Latin）
  使用 `pyftsubset` 或 Google Fonts Helper

- `[MODIFY] src/components/BaseHead.astro`
  移除 fonts.googleapis.com 連結
  加本地 `@font-face` + `font-display: swap`
  保留 preload

### Phase 4：驗證

- `[NEW] .rwd-baseline/` 截圖對比（before / after）
- 跑 PSI Mobile (psi.py) 看 Perf Stage 1 效果
- 本機 `npm run build` 過

---

## Verification Plan

### Manual Verification

- [ ] 25 張 before screenshots 覆蓋所有頁面 × breakpoint
- [ ] 25 張 after screenshots 對比，無破版
- [ ] 桌機（1440px）視覺 100% 不變（B Warm 不動）
- [ ] iPhone SE (375) 文字不溢出、按鈕可點、圖片不變形
- [ ] iPad (768) 多欄 layout 正常切換

### Automated Tests

- [ ] `npm run build` 無 error
- [ ] `python3 scripts/psi.py run https://daydreamdex.com mobile` Perf 分數 ≥ 修改前
- [ ] Lighthouse Best Practices / SEO / Accessibility 不降

---

## Risks & Mitigation

| 風險 | 機率 | 緩解 |
|------|------|------|
| 改 inline style 改壞 B Warm 視覺 | 中 | 桌機 baseline screenshot 嚴格對比 |
| 字型 subset 缺字（罕用漢字） | 中 | 用 Noto 的 zh-TW subset 包 + fallback 到 system font |
| Phase 2 工作量過大、context 用爆 | 高 | 分頁面 commit、可中斷續做 |
| Cloudflare Pages build 失敗 | 低 | 本機 build 過再 push |

---

## 預估時間

- Phase 1（基礎 + 截 baseline）：30 min
- Phase 2（修 4 個頁面）：60-90 min（最大未知數）
- Phase 3（字型 subset）：30 min
- Phase 4（驗證）：15 min

**總：~2.5 hr**（context 可能撐到 Phase 2 中段，可分兩次 session）

---

## Commit 策略

按 task.md 區塊（section）為單位 commit：
1. `feat(rwd): add base utility + mobile-first global.css`
2. `feat(rwd): index.astro mobile breakpoints`
3. `feat(rwd): about.astro mobile breakpoints`
4. `feat(rwd): coaching.astro + blog/index + BlogPost layout`
5. `perf: self-host font subset (Noto Sans/Serif TC)`
