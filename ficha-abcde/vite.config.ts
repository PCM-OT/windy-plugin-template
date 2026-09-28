/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// O preview local serve os mesmos cabeçalhos (CSP etc.) do vercel.json: o e2e testa a política real.
const vercel = JSON.parse(
  readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'),
) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const previewHeaders = Object.fromEntries(
  vercel.headers
    .filter((h) => h.source === '/(.*)')
    .flatMap((h) => h.headers)
    .filter((h) => h.key !== 'Strict-Transport-Security') // HSTS não se aplica a http://localhost
    .map((h) => [h.key, h.value]),
);

export default defineConfig({
  preview: { headers: previewHeaders },
  plugins: [
    react(),
    VitePWA({
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png'],
      registerType: 'prompt',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'] },
      manifest: {
        name: 'Ficha ABCDE',
        short_name: 'Ficha ABCDE',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        id: '/',
        description: 'Ficha de treino ABCDE offline: séries, descanso e histórico.',
        categories: ['health', 'fitness'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
