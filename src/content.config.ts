import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(5),
    description: z.string().min(80).max(170),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // 練功房互連（2026-10-13）：文章尾「到練功房練這題」卡，連到 learn.daydreamdex.com 的題庫試閱／職位指南（SEO 互連，不整篇搬文）
    gym: z.array(z.object({ label: z.string(), href: z.string().url(), note: z.string().optional() })).default([]),
  }),
});

const reviews = defineCollection({
  loader: glob({ base: './src/content/reviews', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    en: z.string(),
    director: z.string(),
    pull: z.string(),
    description: z.string().min(40).max(170),
    order: z.number(),
  }),
});

export const collections = { blog, reviews };
