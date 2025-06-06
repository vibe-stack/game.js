import { defineConfig } from 'vite';
import gameJSPlugin from '@game.js/vite-plugin';

export default defineConfig({
  plugins: [
    ...gameJSPlugin({
      srcDir: 'src',
      appDir: 'app',
      enableEditor: true // Enable WebSocket editor integration
    })
  ],
  server: {
    port: 3000
  }
});
