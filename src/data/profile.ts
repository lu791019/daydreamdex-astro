// profile.ts — Dex 的事實 single source（同步自 ~/Documents/個人品牌/顧問介紹/facts.md）
// 改這檔等同改三頁顯示；改 facts.md 不會自動同步，需手動 mirror 到這裡。

export const PROFILE = {
  name: 'Dex',
  fullName: '盧冠宏 Dex Lu',
  brand: 'DayDreamDex 塵世哲學',

  // 聯絡
  email: 'lu791019@gmail.com',
  lineId: 'k77251',
  phone: '0919-519-809', // 顯示控制：頁面選擇是否露出
  aapdUrl: 'https://aapd.simplybook.asia/v2/#book/service/8/count/1/provider/32/',
  consultingFee: 'NT$ 2,400 / 60 分鐘',
  consultingHours: '平日晚上 / 假日早上 / 假日下午 · GMT+8',

  // 三句招牌語錄
  quotes: {
    consultant: '業界專案不是把技術秀出來，是把問題講清楚、把資料用對地方。',
    instructor: '同理心教學 × 學習體驗優化 — 不只教技術，更陪人走過轉折。',
    coach: '我不會給你標準答案，但會幫你問對問題。',
    signature: '我不是教你怎麼成為我，是陪你找到怎麼成為你。',
    coachBelief:
      "You can know everything in the world, but the only way you're finding out that one is by giving it a shot. — 心靈捕手",
  },

  // 主要數字
  stats: {
    threadsFollowers: 3962,
    newsletterSubs: 320, // hero 預設值；首頁已接 Kit API 走真實
    discord: 1600,
    blogDailyTraffic: '70–100',
    studentsCoached: 100, // 100+ 轉職學員指導
    talks: 10, // 10+ 主持與講座
    certs: 5,
  },

  // 5 張證照（display 順序）
  certs: [
    { label: 'CDA 國際生涯發展諮詢師', source: '擺渡人生學校', topics: ['coaching'] },
    { label: 'AndAction Life Coach 生涯教練', source: 'AndAction', topics: ['coaching'] },
    { label: 'Microsoft 微軟 MPP 大數據 & 資料科學', source: 'Microsoft', topics: ['consultant', 'instructor'] },
    { label: 'AWS AI Practitioner', source: 'AWS', topics: ['consultant', 'instructor'] },
    { label: 'Google GenAI', source: 'Google', topics: ['consultant', 'instructor'] },
  ],

  // 跨領域 10 年技術職涯（招牌順序）
  careerOrgs: ['Hamastar Tech', '水球軟體學院', '緯創', 'LINE Bank', 'TutorABC', 'Micron'],

  // 講師 / 業師合作單位（依頁面分群）
  trustOrgs: {
    coachingBootcamp: ['TibaMe 雲端資料工程師遠距在職班（2026 –）', 'Alpha Camp 作品集陪跑（2023–2024）', '六角學院（2023 –）', '學米（2023 –）', 'nschool 職能學院（2023 –）', '無限學院（2024 –）'],
    coachingEnterprise: ['緯創數據工程學院 DataOps 系列課程', '全齡發展協會', '緯創開發者分享會'],
    coachingUniversity: ['中山大學 RA 產學合作專案'],
    coachingCareer: ['AAPD 職涯陪跑教練（2026 –）', '104 Giver', 'CDA 諮詢師', 'Life Coach 認證', 'Cake 履歷檢診'],
  },
} as const;
