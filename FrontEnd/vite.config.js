// FrontEnd/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // → procesa JSX también en .js/.ts (además de .jsx/.tsx)
      include: [/\.[jt]sx?$/],
      jsxRuntime: "automatic",
    }),
  ],
  server: { port: 3000 }, // usa 3000 si está libre
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/, // todos los .js/.jsx/.ts/.tsx dentro de /src
    jsx: "automatic",
  },
  // Y también durante el prebundle de dependencias
  optimizeDeps: {
    esbuildOptions: { loader: { ".js": "jsx" } },
  },
});
