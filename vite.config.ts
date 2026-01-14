import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // No longer defining process.env.API_KEY here for security.
  // The API Key is now only used in the serverless functions (api/ directory).
});