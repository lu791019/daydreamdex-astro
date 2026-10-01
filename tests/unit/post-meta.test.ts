import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST_CATS, inferTag, readingMinutes, dotDate } from '../../src/utils/post-meta';

describe('POST_CATS', () => {
  it('依首頁 ARCHIVE 篩選順序列出四個分類', () => {
    expect(POST_CATS).toEqual(['轉職', '資料工程', 'AI', '心法']);
  });
});

describe('inferTag', () => {
  it.each([
    ['LangChain 是什麼？', '介紹 LLM 應用開發框架'],
    ['想進入 AI 領域', '軟體工程與機器學習'],
    ['Machine Learning 入門', ''],
    ['AI工程師的日常', ''],
  ])('AI 關鍵字 → AI：%s', (title, desc) => {
    expect(inferTag(title, desc)).toBe('AI');
  });

  it.each([
    ['NoSQL 資料庫的選型和比較', ''],
    ['資料工程師如何成長', ''],
    ['Data Engineer roadmap', ''],
    ['學 Spark 的第一步', ''],
    ['SQL 面試題', ''],
    ['無學位轉職資料分析師', ''],
  ])('資料工程關鍵字 → 資料工程：%s', (title, desc) => {
    expect(inferTag(title, desc)).toBe('資料工程');
  });

  it.each([
    ['Python 自學無痛轉職', ''],
    ['30 多歲轉職必看', ''],
    ['程式新手入門', ''],
    ['My career story', ''],
  ])('轉職關鍵字 → 轉職：%s', (title, desc) => {
    expect(inferTag(title, desc)).toBe('轉職');
  });

  it.each([
    ['僱傭體制的時間剝削困境', ''],
    ['如何找到你的人生志業', ''],
    ['你的下班休息', ''],
    ['長期主義', ''],
  ])('心法關鍵字 → 心法：%s', (title, desc) => {
    expect(inferTag(title, desc)).toBe('心法');
  });

  it('都沒命中時回退為「職涯」', () => {
    expect(inferTag('面試前的準備', '和主管談加薪')).toBe('職涯');
    expect(inferTag('', '')).toBe('職涯');
  });

  it('大小寫不敏感', () => {
    expect(inferTag('LLM', '')).toBe('AI');
    expect(inferTag('PYTHON', '')).toBe('轉職');
  });

  it('description 也會納入判斷', () => {
    expect(inferTag('一篇文章', '用 Python 寫爬蟲')).toBe('轉職');
  });

  it('規則有優先序：AI > 資料工程 > 轉職 > 心法', () => {
    expect(inferTag('用 LangChain 做資料工程', '')).toBe('AI');
    expect(inferTag('Python 轉職資料工程師', '')).toBe('資料工程');
    expect(inferTag('轉職後的休息時間', '')).toBe('轉職');
  });

  // Bug：原本 /ai/ 沒有字界，英文單字裡的 "ai" 會被誤判成 AI 分類
  it.each([
    ['如何寫一封求職 Email', '附上作品集 detail 的技巧'],
    ['用 Airflow 排程', ''],
    ['Maintain 程式碼品質', ''],
    ['Domain knowledge 的重要', ''],
  ])('英文單字內含 "ai" 不應判成 AI：%s', (title, desc) => {
    expect(inferTag(title, desc)).not.toBe('AI');
  });

  it('title 與 description 交界不會拼出假關鍵字（例：…a + i…）', () => {
    expect(inferTag('Data', 'is everything')).not.toBe('AI');
  });
});

describe('readingMinutes', () => {
  it('空字串／未傳入至少回 1 分鐘', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes()).toBe(1);
    expect(readingMinutes(undefined)).toBe(1);
  });

  it('中文以每分鐘 400 字計，無條件進位', () => {
    expect(readingMinutes('字'.repeat(400))).toBe(1);
    expect(readingMinutes('字'.repeat(401))).toBe(2);
    expect(readingMinutes('字'.repeat(1200))).toBe(3);
  });

  it('英文以每分鐘 200 字計', () => {
    expect(readingMinutes(Array(200).fill('word').join(' '))).toBe(1);
    expect(readingMinutes(Array(201).fill('word').join(' '))).toBe(2);
  });

  it('中英混排相加後進位', () => {
    // 200 中文字 = 0.5 分；100 英文字 = 0.5 分 → 1 分
    expect(readingMinutes('字'.repeat(200) + ' ' + Array(100).fill('a').join(' '))).toBe(1);
    expect(readingMinutes('字'.repeat(201) + ' ' + Array(100).fill('a').join(' '))).toBe(2);
  });

  it('略過 fenced code block', () => {
    const code = '```python\n' + Array(1000).fill('print').join(' ') + '\n```';
    expect(readingMinutes(code)).toBe(1);
    expect(readingMinutes('字'.repeat(400) + '\n' + code)).toBe(1);
  });

  it('只有程式碼的文章回 1 分鐘', () => {
    expect(readingMinutes('```js\nconst a = 1;\n```')).toBe(1);
  });

  it('連結只算錨點文字，不算網址', () => {
    const url = 'https://example.com/' + Array(500).fill('seg').join('/');
    expect(readingMinutes(`[看這裡](${url})`)).toBe(1);
    expect(readingMinutes(Array(200).fill(`[a](${url})`).join(' '))).toBe(1);
  });

  it('略過 HTML 標籤本身', () => {
    const tags = Array(500).fill('<span class="foo bar baz">').join('');
    expect(readingMinutes(tags + '字')).toBe(1);
  });

  it('擴充區與相容區漢字也算中文字', () => {
    expect(readingMinutes('㐀'.repeat(401))).toBe(2);
    expect(readingMinutes('豈'.repeat(401))).toBe(2);
  });

  it('標點與空白不計', () => {
    expect(readingMinutes('，。！？'.repeat(1000))).toBe(1);
  });
});

describe('dotDate', () => {
  // 固定在 UTC 以西的時區跑，才測得出時區位移（開發機在 UTC+8 時不會現形）
  const originalTZ = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('格式為 YYYY.MM.DD 並補零', () => {
    expect(dotDate(new Date(Date.UTC(2025, 2, 4)))).toBe('2025.03.04');
    expect(dotDate(new Date(Date.UTC(2024, 11, 31)))).toBe('2024.12.31');
  });

  // Bug：frontmatter 的 pubDate: 2025-03-20 會被 z.coerce.date 解析成 UTC 午夜，
  // 原本用本地時區 getter，在 UTC 以西的時區（如美國的 CI）會顯示成前一天。
  it('frontmatter 日期字串（UTC 午夜）在任何時區都顯示原日期', () => {
    expect(dotDate(new Date('2025-03-20'))).toBe('2025.03.20');
    expect(dotDate(new Date('2024-01-01'))).toBe('2024.01.01');
  });
});
