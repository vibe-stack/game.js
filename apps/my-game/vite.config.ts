import { defineConfig } from 'vite';
import gameJSPlugin from '@game.js/vite-plugin';

export default defineConfig({
  plugins: [
    gameJSPlugin({
      srcDir: 'src',
      appDir: 'app'
    })
  ],
  server: {
    port: 3000
  }
});
