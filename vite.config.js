import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const FLASK_ORIGIN = process.env.FLASK_ORIGIN || 'http://localhost:5000'
const SPRING_ORIGIN = process.env.SPRING_ORIGIN || 'http://localhost:8000'
const YTDL_ORIGIN = process.env.YTDL_ORIGIN || 'http://localhost:5001'

const stripPrefix = (prefix) => (path) =>
    path.replace(new RegExp(`^${prefix}`), '')

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/',
    server: {
        proxy: {
            '/flask': {
                target: FLASK_ORIGIN,
                changeOrigin: true,
                rewrite: stripPrefix('/flask'),
            },
            '/spring': {
                target: SPRING_ORIGIN,
                changeOrigin: true,
                rewrite: stripPrefix('/spring'),
            },
            '/ytdl': {
                target: YTDL_ORIGIN,
                changeOrigin: true,
                rewrite: stripPrefix('/ytdl'),
            },
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
    },
})
