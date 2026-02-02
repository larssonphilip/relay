import 'dotenv/config'
import { CLI } from './adapters/cli.js'
import { TelegramAdapter } from './adapters/telegram.js'

import './skills/shell.js'
import './skills/files.js'
import './skills/homeassistant.js'
import './skills/git.js'

async function main() {
  const args = process.argv.slice(2)

  const runCli = args.includes('cli') || args.length === 0
  const runTelegram = args.includes('telegram')

  const instances: Array<{ name: string; stop: () => void }> = []

  if (runTelegram) {
    const telegram = new TelegramAdapter()
    await telegram.start()
    instances.push({ name: 'telegram', stop: () => telegram.stop() })
  }

  if (runCli) {
    const cli = new CLI()
    await cli.start()
    instances.push({ name: 'cli', stop: () => cli.stop() })
  }

  const shutdown = (signal: string) => {
    console.log(`\n\n👋 Received ${signal}, shutting down...`)
    instances.forEach(instance => {
      console.log(`   Stopping ${instance.name}...`)
      instance.stop()
    })
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGHUP', () => shutdown('SIGHUP'))
}

main().catch(console.error)
