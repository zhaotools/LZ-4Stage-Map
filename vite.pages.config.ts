import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages-site",
  publicDir: "../public",
  base: process.env.GITHUB_ACTIONS ? "/LZ-4Stage-Map/" : "/",
  plugins: [react()],
  build: { outDir: "../dist-pages", emptyOutDir: true },
});
