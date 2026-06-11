import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.WEB_CONTAINER_PORT ?? 5173),
    proxy: {
      "/api": {
        changeOrigin: true,
        target: `http://backend:${Number(process.env.API_CONTAINER_PORT ?? 8000)}`,
      },
      "/health": {
        changeOrigin: true,
        target: `http://backend:${Number(process.env.API_CONTAINER_PORT ?? 8000)}`,
      },
      "/workspace-probe": {
        changeOrigin: true,
        target: `http://backend:${Number(process.env.API_CONTAINER_PORT ?? 8000)}`,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.WEB_CONTAINER_PORT ?? 5173),
  },
});
