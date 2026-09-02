import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "pages-site",
  publicDir: "../public",
  base: process.env.GITHUB_ACTIONS ? "/LZ-4Stage-Map/" : "/",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: { outDir: "../dist-pages", emptyOutDir: true },
});
