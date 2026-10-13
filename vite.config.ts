/// <reference types="vitest/config" />
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// GitHub Pages отдаёт проект по поддомену-пути /<repo>/: base (ассеты, ссылки, scope
// воркера) обязан префиксоваться этим путём. CI ставит GITHUB_PAGES=true и
// GITHUB_REPOSITORY (owner/repo) — base выводится сам, руками настраивать не нужно.
const githubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = githubPages && repoName ? `/${repoName}/` : '/';

/**
 * GitHub Pages не умеет SPA-rewrite: прямые ссылки вида /<repo>/history/2026-10
 * дали бы 404. Копия index.html как 404.html — стандартный обход: Pages отдаёт
 * её по 404, роутер дорисовывает нужный экран. .nojekyll — Pages не трогал файлы
 * с подчёркиваниями и не игнорировал точки.
 */
function githubPagesArtifacts(): Plugin {
  return {
    name: 'github-pages-artifacts',
    apply: 'build',
    async closeBundle() {
      const outDir = path.resolve('dist');
      try {
        const html = await readFile(path.join(outDir, 'index.html'));
        await writeFile(path.join(outDir, '404.html'), html);
        await writeFile(path.join(outDir, '.nojekyll'), '');
      } catch {
        /* нет dist — сборка уже упала с собственной ошибкой, не маскируем её */
      }
    }
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    githubPagesArtifacts(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180.png', 'favicon.svg'],
      manifest: {
        name: 'Учёт смен',
        short_name: 'Учёт смен',
        description: 'Учёт рабочих смен и зарплаты',
        // относительные значения разрешаются от расположения манифеста — корректны
        // и в корне, и на /<repo>/ без правок
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#007AFF',
        background_color: '#FFFFFF',
        lang: 'ru',
        dir: 'ltr',
        icons: [
          { src: './icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: './icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts']
  }
});
