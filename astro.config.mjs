// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://daydreamdex.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    mdx(),
    sitemap({
      // Inject lastmod = build time so Google sees fresh content signal
      serialize(item) {
        return { ...item, lastmod: new Date().toISOString() };
      },
    }),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
