// 文章共用的衍生資訊：分類（與首頁 ARCHIVE 篩選同一套規則）、閱讀時間、日期格式
export const POST_CATS = ['轉職', '資料工程', 'AI', '心法'] as const;

/** 依標題＋摘要推斷分類；規則與 preview/home.astro 的 inferTag 一致 */
export function inferTag(title: string, desc: string): string {
  const text = (title + desc).toLowerCase();
  if (/ai|llm|langchain|機器學習|machine learning/.test(text)) return 'AI';
  if (/資料工程|data engineer|nosql|spark|sql|資料分析|data analyst/.test(text)) return '資料工程';
  if (/轉職|python|career|程式|入門|新手/.test(text)) return '轉職';
  if (/休息|時間|志業|人生|長期/.test(text)) return '心法';
  return '職涯';
}

const CJK_PER_MIN = 400;
const WORDS_PER_MIN = 200;

/** 估算閱讀分鐘數：中文字 400 字／分、英文 200 字／分；略過程式碼區塊與連結網址 */
export function readingMinutes(markdown: string = ''): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const words = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.ceil(cjk / CJK_PER_MIN + words / WORDS_PER_MIN));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 2025.03.20 */
export function dotDate(d: Date): string {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
