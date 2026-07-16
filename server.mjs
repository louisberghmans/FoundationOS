import { createApp } from './src/server/app.mjs'

const app = createApp()
const port = Number(process.env.FOUNDATION_OS_PORT ?? process.env.PORT ?? 3000)
const host = process.env.FOUNDATION_OS_HOST ?? '0.0.0.0'

app.server.listen(port, host, () => {
  console.log(JSON.stringify({ level: 'info', event: 'server_started', host, port }))
})

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'server_stopping', signal }))
  app.server.close(() => {
    app.close()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
