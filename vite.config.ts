import { resolve } from "path";
import { defineConfig } from "vite";
import removeConsole from "vite-plugin-remove-console";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Kitten",
      fileName: (format) => `kitten.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {
          kitten: "Kitten",
        },
      },
    },
  },
  plugins: [removeConsole()],
});
