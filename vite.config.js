import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 3000,
    proxy: {
      '/api/smhi/metobs': {
        target: 'https://opendata-download-metobs.smhi.se',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smhi\/metobs/, ''),
      },
      '/api/smhi/ocobs': {
        target: 'https://opendata-download-ocobs.smhi.se',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smhi\/ocobs/, ''),
      },
    },
  },
  build: {
    target: 'esnext',
  },
});
