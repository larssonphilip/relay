import Anthropic from '@anthropic-ai/sdk'
import type { Message, ClaudeMessage, ConversationContext } from './types.js'
import { Memory } from './memory.js'

export class Agent {
  private client: Anthropic
  private memory: Memory
  private model = 'claude-sonnet-4-20250514'

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    this.memory = new Memory()
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const factsList = context.relevantFacts.length > 0
      ? context.relevantFacts.map(f => `- ${f.content}`).join('\n')
      : '(No facts stored yet)'

    return `You are a terse technical assistant for electronics development and home automation.

Environment:
- OS: macOS
- Editor: Neovim
- Workflow: Terminal-based with tmux

Known facts:
${factsList}

Rules:
1. Be direct and technical - no fluff
2. Show code/output, don't describe it
3. Use tools proactively for reads (don't ask permission)
4. For writes/destructive actions, show the change and ask "Apply?"
5. Remember technical details (pin assignments, addresses, commands)

Keep responses concise. When showing code or diffs, use the actual content.`
  }

  private buildMessages(context: ConversationContext, userMessage: string): ClaudeMessage[] {
    const messages: ClaudeMessage[] = []

    context.recentMessages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    })

    messages.push({
      role: 'user',
      content: userMessage
    })

    return messages
  }

  async processMessage(userMessage: string): Promise<string> {
    this.memory.saveMessage({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    })

    const context = this.memory.getContext(userMessage)

    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessages(context, userMessage)

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    })

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n')

    this.memory.saveMessage({
      role: 'assistant',
      content: textContent,
      timestamp: Date.now()
    })

    return textContent
  }

  close(): void {
    this.memory.close()
  }
}
