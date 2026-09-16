import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/aeromint-v2-miniapp/",
  plugins: [react()],
});
