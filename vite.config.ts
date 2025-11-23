import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy manifest and assets to the dist folder after build
const copyAssets = () => {
  return {
    name: 'copy-assets',
    closeBundle() {
      // 1. Copy and modify Manifest
      const manifestPath = resolve(__dirname, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        
        // Point to the built files in dist
        manifest.action.default_popup = 'src/popup/index.html';
        manifest.content_scripts[0].js = ['content.js'];
        manifest.content_scripts[0].css = ['content.css'];

        if (!fs.existsSync('dist')) fs.mkdirSync('dist');
        fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
      }

      // 2. Copy Content Styles
      const cssSource = resolve(__dirname, 'src/content/styles.css');
      if (fs.existsSync(cssSource)) {
        fs.copyFileSync(cssSource, 'dist/content.css');
      }

      // 3. Copy Public Assets (Icons, etc.)
      // This copies everything from public/ to dist/
      const publicDir = resolve(__dirname, 'public');
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir);
        files.forEach(file => {
          const srcFile = resolve(publicDir, file);
          const destFile = resolve('dist', file);
          // Ensure we are copying files, not directories (simplification)
          if (fs.lstatSync(srcFile).isFile()) {
             fs.copyFileSync(srcFile, destFile);
          }
        });
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});