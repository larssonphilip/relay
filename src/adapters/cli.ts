import readline from 'readline'
import consola from 'consola'
import { Agent } from '../core/agent.js'
import { ZEN_MODELS } from '../lib/providers/zen.js'

export class CLI {
  private agent: Agent
  private rl: readline.Interface

  constructor() {
    this.agent = new Agent()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    })
  }

  async start() {
    const currentModel = ZEN_MODELS.find(m => m.id === this.agent.getModel())

    consola.box('AI Assistant')
    consola.info(`Model: ${currentModel?.name || this.agent.getModel()}`)
    consola.info('Commands: /models, /facts, /exit\n')

    this.rl.prompt()

    this.rl.on('line', async (line) => {
      const input = line.trim()

      if (!input) {
        this.rl.prompt()
        return
      }

      if (input.startsWith('/')) {
        await this.handleCommand(input)
        this.rl.prompt()
        return
      }

      try {
        consola.start('Thinking...')
        const response = await this.agent.reason(input)
        consola.success('Done')
        console.log(`\n${response}\n`)
      } catch (error: any) {
        consola.error('Error:', error.message)
      }

      this.rl.prompt()
    })

    this.rl.on('close', () => {
      this.agent.close()
      consola.info('\nGoodbye!')
      process.exit(0)
    })
  }

  private async handleCommand(cmd: string) {
    const [command, ...args] = cmd.slice(1).split(' ')

    switch (command) {
      case 'models':
        this.showModels()
        break

      case 'model':
        if (args.length === 0) {
          const current = ZEN_MODELS.find(m => m.id === this.agent.getModel())
          consola.info(`Current: ${current?.name || this.agent.getModel()}`)
        } else {
          this.setModel(args.join(' '))
        }
        break

      case 'facts':
        this.showFacts()
        break

      case 'exit':
      case 'quit':
        this.rl.close()
        break

      default:
        consola.warn(`Unknown command: /${command}`)
        consola.info('Available: /models, /facts, /exit')
    }
  }

  private showModels() {
    const current = this.agent.getModel()

    const byCategory: Record<string, typeof ZEN_MODELS> = {}
    ZEN_MODELS.forEach(model => {
      if (!byCategory[model.category]) byCategory[model.category] = []
      byCategory[model.category].push(model)
    })

    consola.info('\nAvailable models:\n')

    let globalIndex = 1
    const icons: Record<string, string> = {
      'Free': '🆓',
      'Claude': '🧠',
      'GPT': '🤖',
      'Gemini': '✨',
      'Other': '🌐'
    }

    const order = ['Free', 'Claude', 'GPT', 'Gemini', 'Other']

    order.forEach(category => {
      if (byCategory[category]) {
        consola.info(`${icons[category]} ${category}:`)
        byCategory[category].forEach(model => {
          const isCurrent = model.id === current
          const marker = isCurrent ? '→' : ' '
          const freeTag = model.free ? ' (FREE)' : ''
          console.log(`${marker} ${globalIndex}. ${model.name}${freeTag}`)
          console.log(`   \x1b[90m${model.id}\x1b[0m`) // gray color using ANSI
          globalIndex++
        })
        console.log()
      }
    })

    consola.info('Switch: /model <number> or /model <name>')
    consola.info('Examples:')
    console.log('  /model 1          → Switch to first model')
    console.log('  /model pickle     → Switch to Big Pickle')
    console.log('  /model sonnet     → Switch to Claude Sonnet')
    console.log('  /model gpt-5.2    → Switch to GPT 5.2')
    console.log()
  }

  private setModel(input: string) {
    const num = parseInt(input)
    if (!isNaN(num) && num >= 1 && num <= ZEN_MODELS.length) {
      const model = ZEN_MODELS[num - 1]
      this.agent.setModel(model.id)
      const freeTag = model.free ? ' (FREE)' : ''
      consola.success(`✓ Switched to ${model.name}${freeTag}`)
      return
    }

    const query = input.toLowerCase()
    const match = ZEN_MODELS.find(m =>
      m.id.toLowerCase().includes(query) ||
      m.name.toLowerCase().includes(query)
    )

    if (match) {
      this.agent.setModel(match.id)
      const freeTag = match.free ? ' (FREE)' : ''
      consola.success(`✓ Switched to ${match.name}${freeTag}`)
    } else {
      consola.error(`Model not found: ${input}`)
      consola.info('Use /models to see available options')
    }
  }

  private showFacts() {
    const memory = this.agent.getMemory()
    const facts = memory.getAllFacts(20)

    if (facts.length === 0) {
      consola.info('No facts stored yet')
      return
    }

    consola.info('\nStored facts:')
    facts.forEach((fact, idx) => {
      const date = new Date(fact.timestamp).toLocaleString()
      console.log(`  ${idx + 1}. ${fact.content}`)
      console.log(`     \x1b[90m${date}\x1b[0m`) // gray color
    })
    console.log()
  }
}
