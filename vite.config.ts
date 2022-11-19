import { defineConfig } from "vite";
import { resolve } from "path";

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
});
