/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
        // Ícones (192, 512, maskable) entram na Fase 4.
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
