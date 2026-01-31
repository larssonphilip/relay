import { zenGenerateText } from '../lib/providers/zen.js'
import { Memory } from './memory.js'
import { skillRegistry } from '../skills/index.js'
import type { Message, AgentConfig } from './types.js'
import { DEFAULT_MODEL } from './types.js'

export class Agent {
  private memory: Memory
  private config: AgentConfig

  constructor(config?: Partial<AgentConfig>) {
    this.memory = new Memory()
    this.config = {
      model: config?.model || DEFAULT_MODEL,
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7
    }
  }

  setModel(model: string): void {
    this.config.model = model
  }

  getModel(): string {
    return this.config.model
  }

  async reason(userMessage: string): Promise<string> {
    this.memory.saveMessage({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    })

    const context = this.memory.getContext()
    const systemPrompt = this.buildSystemPrompt(context)
    const messages = context.recentMessages.map((msg: Message) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    const tools = skillRegistry.toToolDefinitions()

    let response = await zenGenerateText({
      model: this.config.model,
      messages,
      system: systemPrompt,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      tools
    })

    let finalResponse = response.text
    let toolResults: string[] = []

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        console.log(`\n🔧 Executing: ${toolCall.name}`)
        console.log(`   Parameters: ${JSON.stringify(toolCall.input, null, 2)}`)

        const result = await skillRegistry.execute(toolCall.name, toolCall.input)

        if (result.success) {
          console.log(`   ✓ Success`)
          toolResults.push(`Tool: ${toolCall.name}\nResult: ${result.output}`)
        } else {
          console.log(`   ✗ Error: ${result.error}`)
          toolResults.push(`Tool: ${toolCall.name}\nError: ${result.error}`)
        }
      }

      if (toolResults.length > 0) {
        finalResponse = response.text + '\n\n' + toolResults.join('\n\n')
      }
    }

    this.memory.saveMessage({
      role: 'assistant',
      content: finalResponse,
      timestamp: Date.now()
    })

    return finalResponse
  }

  private buildSystemPrompt(context: any): string {
    const facts = context.relevantFacts
      .map((f: any) => `- ${f.content}`)
      .join('\n')

    const tools = skillRegistry.getAll()
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n')

    return `You are a terse technical assistant for electronics and home automation work.

Environment:
- OS: macOS
- Editor: Neovim
- Workflow: Terminal, tmux

Available tools:
${tools}

Known facts:
${facts || '(none yet)'}

Rules:
1. Be direct and concise
2. Show code/output, don't describe it
3. No fluff or unnecessary explanations
4. Use tools proactively when helpful
5. When using tools, explain what you're doing briefly`
  }

  getMemory(): Memory {
    return this.memory
  }

  close(): void {
    this.memory.close()
  }
}
