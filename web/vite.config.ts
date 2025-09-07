import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": { target: "http://localhost:4100", changeOrigin: true },
      "/exports": { target: "http://localhost:4100", changeOrigin: true }
    }
  }
});
