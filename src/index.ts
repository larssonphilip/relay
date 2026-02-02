import 'dotenv/config'
import { CLI } from './adapters/cli.js'
import { TelegramAdapter } from './adapters/telegram.js'

import './skills'

async function main() {
  const args = process.argv.slice(2)
  const runCli = args.includes('cli') || args.length === 0
  const runTelegram = args.includes('telegram')

  const instances: Array<{ name: string; stop: () => void }> = []

  if (runTelegram) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.log('\nTELEGRAM_BOT_TOKEN not configured!')
      console.log('Please configure Telegram in CLI: → /setup\n')
      process.exit(1)
    }

    const telegram = new TelegramAdapter()
    await telegram.start()
    instances.push({ name: 'telegram', stop: () => telegram.stop() })
  }

  if (runCli) {
    // Allow CLI to start even without API key - user can configure with /setup
    if (!process.env.OPENCODE_ZEN_API_KEY) {
      console.log('\nOpenCode Zen API key not configured')
      console.log('Run /setup in the CLI to configure\n')
    }

    const cli = new CLI()
    await cli.start()
    instances.push({ name: 'cli', stop: () => cli.stop() })
  }

  const shutdown = (signal: string) => {
    console.log(`\n\nReceived ${signal}, shutting down...`)
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
