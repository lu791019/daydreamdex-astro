// Site-wide constants — used in SEO, layouts, and components.

export const SITE_TITLE = 'Daydream Dex';
export const SITE_TAGLINE = 'Dex 的塵世哲學 — 程式、職涯與 AI 探索';
export const SITE_DESCRIPTION =
  'Dex，Daydream Dex 創辦人。轉職顧問 × AI 技術總監，10 年跨界 4 種專業，從半導體到資料工程、軟體、AI。輔導學員打造作品集、撰寫履歷、規劃職涯，陪你達到軟體和資料職涯目標。';
export const SITE_URL = 'https://daydreamdex.com';
export const AUTHOR = 'Dex';

export const HERO_TAGLINE =
  '轉職顧問 × AI 技術總監，10 年跨界 4 種專業，陪你達到軟體和資料職涯目標';

// Person schema — replaces 站長路可 Organization parasitic schema
export const AUTHOR_BIO_SHORT =
  '轉職顧問 × AI 技術總監，10 年跨界 4 種專業，陪你達成軟體和資料職涯目標';
export const AUTHOR_JOB_TITLE = 'AI 技術總監 / Staff Engineer';
export const AUTHOR_WORKS_FOR = 'HamaStar';

// Social links — used in Footer + Person schema sameAs
export const SOCIAL_LINKS = [
  { name: 'Threads', url: 'https://www.threads.com/@daydreamdex', icon: 'simple-icons:threads' },
  { name: 'Instagram', url: 'https://www.instagram.com/daydreamdex/', icon: 'simple-icons:instagram' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/daydreamdex/', icon: 'simple-icons:linkedin' },
  { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61560603174482', icon: 'simple-icons:facebook' },
  { name: 'Spotify', url: 'https://open.spotify.com/show/2qV49EUjFOcJIqkUjwmu2T', icon: 'simple-icons:spotify' },
] as const;

// Featured 5 posts — shown on home page
export const FEATURED_POST_SLUGS = [
  'python-career-transition-guide-and-experience',
  'three-steps-to-get-job-and-become-python-engineer',
  'data-engineer-career-roadmap-from-skills-to-interview',
  'software-or-machine-learning-to-ai',
  '30s-career-change-5-questions-to-ask',
] as const;

// CTA links
export const CTA_BOOKING_URL =
  'https://aapd.simplybook.asia/v2/#book/service/8/count/1/provider/32/';
export const CTA_COURSE_URL = 'https://www.tibame.com/goodjob/clouddataengineer';
export const CTA_COURSE_DISCOUNT_CODE = 'DEXFANS50';
