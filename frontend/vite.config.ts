import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/chat": "http://127.0.0.1:8080",
      "/chat/stream": "http://127.0.0.1:8080",
      "/upload": "http://127.0.0.1:8080",
      "/transcribe": "http://127.0.0.1:8080",
      "/generate-speech": "http://127.0.0.1:8080",
      "/history": "http://127.0.0.1:8080",
      "/validate": "http://127.0.0.1:8080",
      "/health": "http://127.0.0.1:8080",
    },
  },
});
