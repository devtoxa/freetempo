import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')

const PORT = Number(process.env.PORT || 3000)
const FLASK_ORIGIN = process.env.FLASK_ORIGIN || 'http://localhost:5000'
const SPRING_ORIGIN = process.env.SPRING_ORIGIN || 'http://localhost:8000'
const YTDL_ORIGIN = process.env.YTDL_ORIGIN || 'http://localhost:5001'

const app = express()

const proxyOptions = (target) => ({
    target,
    changeOrigin: true,
    proxyTimeout: 120000,
    timeout: 120000,
})

// 동일 오리진으로 백엔드 서비스 프록시 (CORS 불필요)
app.use('/flask', createProxyMiddleware(proxyOptions(FLASK_ORIGIN)))
app.use('/spring', createProxyMiddleware(proxyOptions(SPRING_ORIGIN)))
app.use('/ytdl', createProxyMiddleware(proxyOptions(YTDL_ORIGIN)))

app.use(express.static(distDir))

// SPA fallback
app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
    console.log(`[freetempo] http://localhost:${PORT}`)
    console.log(`  /flask  -> ${FLASK_ORIGIN}`)
    console.log(`  /spring -> ${SPRING_ORIGIN}`)
    console.log(`  /ytdl   -> ${YTDL_ORIGIN}`)
})
