import TelegramBot from 'node-telegram-bot-api'
import { Agent } from '../core/agent.js'
import { ZEN_MODELS } from '../lib/providers/zen.js'

export class TelegramAdapter {
  private bot: TelegramBot
  private agent: Agent
  private allowedUsers: Set<number>

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not set in .env')
    }

    this.bot = new TelegramBot(token, { polling: true })
    this.agent = new Agent({ dbPath: './data/memory-telegram.db' })

    const allowedUsersStr = process.env.TELEGRAM_ALLOWED_USERS || ''
    this.allowedUsers = new Set(
      allowedUsersStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    )

    this.setupHandlers()
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id
      const userId = msg.from?.id

      console.log(`📱 /start from user ${userId} (chat ${chatId})`)

      if (!this.isAllowed(userId)) {
        await this.bot.sendMessage(
          chatId,
          `Unauthorized. Your user ID is: ${userId}\n\nAdd this to TELEGRAM_ALLOWED_USERS in .env`
        )
        return
      }

      await this.bot.sendMessage(
        chatId,
        `Welcome to Relay Assistant!\n\nCurrently using: ${this.getModelName()}\n\nCommands:\n/model - Change model\n/models - List models\n/facts - Show facts\n/help - Show help`
      )
    })

    this.bot.onText(/\/models/, async (msg) => {
      if (!this.isAllowed(msg.from?.id)) return

      const current = this.agent.getModel()
      let response = '📋 Available models:\n\n'

      const byCategory: Record<string, typeof ZEN_MODELS> = {}
      ZEN_MODELS.forEach(model => {
        if (!byCategory[model.category]) byCategory[model.category] = []
        byCategory[model.category].push(model)
      })

      let idx = 1
      const order = ['Free', 'Claude', 'GPT', 'Gemini', 'Other']

      order.forEach(category => {
        if (byCategory[category]) {
          const icon = { Free: '🆓', Claude: '🧠', GPT: '🤖', Gemini: '✨', Other: '🌐' }[category]
          response += `${icon} *${category}:*\n`

          byCategory[category].forEach(model => {
            const marker = model.id === current ? '→ ' : '  '
            const freeTag = model.free ? ' (FREE)' : ''
            response += `${marker}${idx}. ${model.name}${freeTag}\n`
            idx++
          })
          response += '\n'
        }
      })

      response += 'Use /model <number> or /model <name> to switch'

      await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' })
    })

    this.bot.onText(/\/model(?:\s+(.+))?/, async (msg, match) => {
      if (!this.isAllowed(msg.from?.id)) return

      const arg = match?.[1]?.trim()

      if (!arg) {
        const current = this.getModelName()
        await this.bot.sendMessage(msg.chat.id, `Current model: ${current}`)
        return
      }

      const num = parseInt(arg)
      if (!isNaN(num) && num >= 1 && num <= ZEN_MODELS.length) {
        const model = ZEN_MODELS[num - 1]
        this.agent.setModel(model.id)
        await this.bot.sendMessage(msg.chat.id, `✓ Switched to ${model.name}`)
        return
      }

      const query = arg.toLowerCase()
      const match_model = ZEN_MODELS.find(m =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
      )

      if (match_model) {
        this.agent.setModel(match_model.id)
        await this.bot.sendMessage(msg.chat.id, `✓ Switched to ${match_model.name}`)
      } else {
        await this.bot.sendMessage(msg.chat.id, `❌ Model not found: ${arg}`)
      }
    })

    this.bot.onText(/\/facts/, async (msg) => {
      if (!this.isAllowed(msg.from?.id)) return

      const facts = this.agent.getMemory().getAllFacts(20)

      if (facts.length === 0) {
        await this.bot.sendMessage(msg.chat.id, 'No facts stored yet')
        return
      }

      let response = '📚 Stored facts:\n\n'
      facts.forEach((fact, idx) => {
        response += `${idx + 1}. ${fact.content}\n`
      })

      await this.bot.sendMessage(msg.chat.id, response)
    })

    this.bot.onText(/\/help/, async (msg) => {
      if (!this.isAllowed(msg.from?.id)) return

      const help = `🤖 *Relay Assistant Help*

*Commands:*
/start - Start the bot
/models - List available models
/model <name> - Switch model
/facts - Show stored facts
/help - Show this help

*Features:*
- Execute shell commands
- Read/write files
- Git operations
- Home Assistant control
- Persistent memory

Just send a message to chat!`

      await this.bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' })
    })

    this.bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) return

      if (!this.isAllowed(msg.from?.id)) {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Unauthorized. Your user ID is: ${msg.from?.id}`
        )
        return
      }

      const chatId = msg.chat.id
      const text = msg.text

      if (!text) return

      try {
        await this.bot.sendChatAction(chatId, 'typing')

        console.log(`📱 Message from ${msg.from?.username}: ${text}`)

        const response = await this.agent.reason(text)

        if (response.length <= 4096) {
          await this.bot.sendMessage(chatId, response)
        } else {
          const chunks = this.splitMessage(response, 4096)
          for (const chunk of chunks) {
            await this.bot.sendMessage(chatId, chunk)
          }
        }
      } catch (error: any) {
        console.error('Telegram error:', error)
        await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
      }
    })

    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error)
    })
  }

  private isAllowed(userId?: number): boolean {
    if (!userId) return false

    if (this.allowedUsers.size === 0) {
      console.warn('No TELEGRAM_ALLOWED_USERS configured - allowing all users!')
      return true
    }

    return this.allowedUsers.has(userId)
  }

  private getModelName(): string {
    const model = ZEN_MODELS.find(m => m.id === this.agent.getModel())
    return model?.name || this.agent.getModel()
  }

  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = []
    let current = ''

    const lines = text.split('\n')

    for (const line of lines) {
      if (current.length + line.length + 1 > maxLength) {
        chunks.push(current)
        current = line
      } else {
        current += (current ? '\n' : '') + line
      }
    }

    if (current) chunks.push(current)

    return chunks
  }

  async start() {
    console.log('Telegram bot started')
    console.log(`Bot: @${(await this.bot.getMe()).username}`)
    console.log(`Allowed users: ${Array.from(this.allowedUsers).join(', ') || 'ALL (development mode)'}`)
  }

  stop() {
    this.bot.stopPolling()
    this.agent.close()
  }
}
