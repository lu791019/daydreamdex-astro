# V2 頁面改版共用規格（2026-10-01）

> 給改版 agent 用。專案：`/Users/dex/blog/migration/astro-site`（Astro 6，分支 `feat/service-hub`）。
> 參考實作：`src/pages/preview/home.astro` ＋ `src/styles/v2.css` ＋ `src/components/v2/V2Nav.astro`、`V2Footer.astro`。動手前先完整讀這四個檔。

## 必守規則
1. **內容以原頁為主**：原頁所有文字、區塊、連結、CTA、JSON-LD、SEO 元件、GA 都要保留（Dex 明確要求保留原內容）。只換「外觀」與修正下列事實：
   - 學員數一律 **50+**（不是 100+／200+）；職稱 **AI 技術總監**；品牌名 **Dex 的塵世哲學**（DayDream Director 是 logo，頁首頁尾已處理）
   - 寫死會過期的文字（例：「本月還有 3 個時段」）改成「諮詢開放預約中」
2. **外觀換成 v2 風格**：`<body class="pv">`，`import '../styles/v2.css'`（路徑依檔案位置），頁首 `<V2Nav chatHref={FREE_CHAT_URL} hall="HALL 0X" />`，頁尾 `<V2Footer />`，取代舊的 `TopBar`／`Footer`。
   - 色票：深咖啡 `#16100C`、紙 `#FAF6EF`、琥珀 `#F0B45E`、CTA 深橘 `#B45309`、奶油字 `#F3EBDD`。深色段用 `class="dark grain"`、淺色段用 `class="paper"`，交錯排列。
   - **字型只用黑體**（v2.css 的 `--sans`）；**禁止中文明體／serif**。英文引言可用 Georgia 斜體；英文小標（SCENE、REEL、NOW SHOWING 之類）用 `font-family: var(--pixel)`（Silkscreen 像素字，已自架）。
   - 電影元素：SCENE 台詞卡、膠捲孔、場記板、`marquee-bulbs` 燈泡、ADMIT ONE、通告單卡片（`.case` 樣式）、位移陰影按鈕（`.btn .btn-amber / .btn-cta / .btn-line / .btn-ghost`，v2.css 已定義）。
   - **可讀性**：內文 ≥ 16px、深底文字用 `--cream` 或 `--cream-dim`（.86），不要再出現看不清楚的淡字（Dex 抱怨過）。
3. **頁面專屬樣式**放新檔 `src/styles/v2-<頁名>.css`，不要改 `v2.css`（避免多人同時改同一檔）。共用 class 優先沿用 v2.css。
4. **不要改**：`src/pages/index.astro`、`src/pages/preview/home.astro`、`v2.css`、V2Nav、V2Footer、別的 agent 負責的頁面。
5. **不要** `npm run build`、不要跑 playwright 測試套件、不要 git commit（主控會統一做）。
6. 驗證方式：自己開 dev server（`npx astro dev --port <指定 port>`，背景執行），用 Playwright 腳本截圖 1440／1024／390 三個寬度，確認：無水平溢出、無 console error、無壞圖、文字清楚。腳本放 scratchpad，不要放進專案。結束時關掉自己的 dev server。

## 常數
- 免費聊聊：`https://calendly.com/daydreamisexp/meet-with-me`（個人與組織暫時共用）
- 正式預約：`CTA_BOOKING_URL`（`src/consts.ts`）
- Podcast：`https://open.spotify.com/show/2qV49EUjFOcJIqkUjwmu2T`（沒走歪的才奇怪）、`https://open.spotify.com/show/5oy6A25HTtZE9hQAMSJCML`（塵影）

## 回報格式
1. 改了哪些檔（新增／修改）
2. 原頁每個區塊 → 新頁對應位置（表格），標出有沒有刪掉任何東西（原則上不刪）
3. 修正了哪些事實（50+、職稱、過期文字）
4. 三個寬度的檢查結果
