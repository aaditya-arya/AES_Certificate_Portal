import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist/client',emptyOutDir:true},server:{proxy:{'/api':`http://127.0.0.1:${Number(process.env.API_PORT)||3001}`}}});
