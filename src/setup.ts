import prompts from 'prompts'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface SetupConfig {
  opencode_api_key?: string
  ha_url?: string
  ha_token?: string
  telegram_bot_token?: string
  telegram_user_id?: string
}

export async function runSetup() {
  console.log('\nWelcome to Relay Setup!\n')
  console.log('This wizard will help you configure Relay.\n')

  const config: SetupConfig = {}

  const envExists = existsSync('.env')
  if (envExists) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: '.env file already exists. Do you want to reconfigure?',
      initial: false
    })

    if (!overwrite) {
      console.log('\nSetup cancelled. Using existing .env\n')
      return
    }
  }

  console.log('OpenCode Zen API Setup (Required)')
  console.log('Get your API key at: https://opencode.ai/auth\n')

  const { opencode_api_key } = await prompts({
    type: 'password',
    name: 'opencode_api_key',
    message: 'OpenCode Zen API Key:',
    validate: (value) => value.length > 0 || 'API key is required'
  })

  config.opencode_api_key = opencode_api_key

  console.log('\nHome Assistant Setup (Optional)')

  const { setup_ha } = await prompts({
    type: 'confirm',
    name: 'setup_ha',
    message: 'Do you want to configure Home Assistant integration?',
    initial: false
  })

  if (setup_ha) {
    const ha_config = await prompts([
      {
        type: 'text',
        name: 'ha_url',
        message: 'Home Assistant URL:',
        initial: 'http://homeassistant.local:8123'
      },
      {
        type: 'password',
        name: 'ha_token',
        message: 'Home Assistant Long-Lived Access Token:'
      }
    ])

    config.ha_url = ha_config.ha_url
    config.ha_token = ha_config.ha_token

    console.log('\nTo create a token:')
    console.log('   1. Go to your Home Assistant profile')
    console.log('   2. Scroll to "Long-Lived Access Tokens"')
    console.log('   3. Click "Create Token"')
  }

  console.log('\nTelegram Bot Setup (Optional)')

  const { setup_telegram } = await prompts({
    type: 'confirm',
    name: 'setup_telegram',
    message: 'Do you want to configure Telegram bot?',
    initial: false
  })

  if (setup_telegram) {
    console.log('\nTo create a bot:')
    console.log('   1. Message @BotFather on Telegram')
    console.log('   2. Send /newbot and follow the prompts')
    console.log('   3. Copy the API token\n')

    const { telegram_bot_token } = await prompts({
      type: 'password',
      name: 'telegram_bot_token',
      message: 'Telegram Bot Token:'
    })

    config.telegram_bot_token = telegram_bot_token

    console.log('\nTo get your user ID:')
    console.log('   1. Start the bot (we\'ll help you with this)')
    console.log('   2. Send /start to your bot')
    console.log('   3. Check the console for your user ID\n')

    const { know_user_id } = await prompts({
      type: 'confirm',
      name: 'know_user_id',
      message: 'Do you already know your Telegram user ID?',
      initial: false
    })

    if (know_user_id) {
      const { telegram_user_id } = await prompts({
        type: 'text',
        name: 'telegram_user_id',
        message: 'Your Telegram User ID:'
      })

      config.telegram_user_id = telegram_user_id
    } else {
      console.log('\nYou can add your user ID later by:')
      console.log('   1. Run: npm run telegram')
      console.log('   2. Send /start to your bot')
      console.log('   3. Copy the user ID from console')
      console.log('   4. Add to .env: TELEGRAM_ALLOWED_USERS=<your-id>')
    }
  }

  await writeEnvFile(config)

  if (!existsSync('data')) {
    await mkdir('data', { recursive: true })
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || '~'
  const serialLogsPath = path.join(homeDir, 'serial_logs')
  if (!existsSync(serialLogsPath)) {
    await mkdir(serialLogsPath, { recursive: true })
    console.log(`\nCreated: ${serialLogsPath}`)
  }

  console.log('\nSetup complete!\n')
  console.log('Next steps:')
  console.log('  • Run CLI:      npm run dev')
  if (config.telegram_bot_token) {
    console.log('  • Run Telegram: npm run telegram')
    console.log('  • Run both:     npm run both')
  }
  console.log('  • See models:   Type /models in CLI or Telegram')
  console.log('')
}

async function writeEnvFile(config: SetupConfig) {
  let envContent = '# Relay Configuration\n\n'

  envContent += '# OpenCode Zen API\n'
  envContent += `OPENCODE_ZEN_API_KEY=${config.opencode_api_key}\n\n`

  if (config.ha_url || config.ha_token) {
    envContent += '# Home Assistant\n'
    envContent += `HA_URL=${config.ha_url || 'http://homeassistant.local:8123'}\n`
    envContent += `HA_TOKEN=${config.ha_token || ''}\n\n`
  }

  if (config.telegram_bot_token) {
    envContent += '# Telegram Bot\n'
    envContent += `TELEGRAM_BOT_TOKEN=${config.telegram_bot_token}\n`
    envContent += `TELEGRAM_ALLOWED_USERS=${config.telegram_user_id || ''}\n`
  }

  await writeFile('.env', envContent, 'utf-8')
  console.log('\nCreated .env file')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup().catch(console.error)
}
