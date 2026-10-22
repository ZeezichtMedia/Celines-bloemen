// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

const SITE = 'https://celinesbloemen.nl';
// Niet in de sitemap: beheer, afrekenen en bevestigingspagina's
const NOINDEX = ['/admin', '/afrekenen', '/bestelling/bevestiging', '/abonnementen/bevestiging'];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Server: elke pagina leest mededeling en openingstijden uit het beheer; de CDN bewaart ze (middleware.ts)
  output: 'server',
  adapter: vercel({
    // Ruimte voor SMTP + Mollie in één request (default 10s is krap bij een koude start)
    maxDuration: 30,
  }),
  integrations: [
    react(),
    icon(),
    sitemap({
      filter: (page) => !NOINDEX.some((p) => page.startsWith(`${SITE}${p}`)),
    }),
  ],
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
