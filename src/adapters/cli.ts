import readline from 'readline'
import consola from 'consola'
import { Agent } from '../core/agent.js'

export class CLI {
  private agent: Agent
  private rl: readline.Interface

  constructor() {
    this.agent = new Agent()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n> '
    })
  }

  async start() {
    consola.box('AI Assistant - Local Development Helper')
    consola.info('Type your messages. Press Ctrl+C to exit.\n')

    this.rl.prompt()

    this.rl.on('line', async (input) => {
      const message = input.trim()

      if (!message) {
        this.rl.prompt()
        return
      }

      if (message === '/exit' || message === '/quit') {
        this.shutdown()
        return
      }

      try {
        consola.start('Thinking...')

        const response = await this.agent.processMessage(message)

        consola.success('Assistant:')
        console.log(response)

      } catch (error) {
        consola.error('Error:', error instanceof Error ? error.message : 'Unknown error')
      }

      this.rl.prompt()
    })

    this.rl.on('close', () => {
      this.shutdown()
    })
  }

  private shutdown() {
    consola.info('\nShutting down...')
    this.agent.close()
    process.exit(0)
  }
}
