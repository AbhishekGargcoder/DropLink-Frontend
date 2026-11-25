import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: true,   // same as 0.0.0.0, listens on all interfaces
    port: 5173,
  },
});
