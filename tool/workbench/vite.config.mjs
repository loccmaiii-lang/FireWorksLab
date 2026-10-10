import {directorReadPlugin} from './server/director-read.mjs';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {releasePreviewPlugin} from './server/release-preview.mjs';
import {demoMusicPlugin} from './server/demo-music.mjs';

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    allowedHosts: ["terminal.local"],
    proxy: {
      '^/api/actors?(?:\\?|$)': {
        target:'http://127.0.0.1:8017', changeOrigin:true,
        configure(proxy){proxy.on('proxyReq',(req)=>{req.setHeader('Origin','http://127.0.0.1:8017');req.setHeader('Sec-Fetch-Site','same-origin');});}
      }
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [releasePreviewPlugin(),demoMusicPlugin(),react(),directorReadPlugin()],
});
