// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://celinesbloemen.nl';
// Niet in de sitemap: beheer, afrekenen en bevestigingspagina's
const NOINDEX = ['/admin', '/afrekenen', '/bestelling/bevestiging', '/abonnementen/bevestiging'];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  adapter: vercel({
    // Ruimte voor SMTP + Mollie in één request (default 10s is krap bij een koude start)
    maxDuration: 30,
  }),
  integrations: [
    react(),
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
