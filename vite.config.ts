import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "./plugins/component-tagger";

export default defineConfig({
  // Le preview passe par un proxy : le serveur doit écouter sur toutes les interfaces, port 5173 fixe.
  server: {
    host: "::",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  plugins: [react(), componentTagger()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
