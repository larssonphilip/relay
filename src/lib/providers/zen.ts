export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string | Array<any>
}

const ZEN_BASE_URL = "https://opencode.ai/zen"

function getEndpoint(model: string): string {
  const m = model.toLowerCase()
  if (m.startsWith('claude-')) return '/v1/messages'
  if (m.startsWith('gpt-')) return '/v1/responses'
  if (m.startsWith('gemini-')) return `/v1/models/${model}`
  return '/v1/chat/completions'
}

export async function zenGenerateText(opts: {
  model: string
  messages: ChatMessage[]
  system?: string
  maxTokens?: number
  temperature?: number
  tools?: Array<{
    name: string
    description: string
    input_schema: any
  }>
}): Promise<{
  text: string
  toolCalls?: Array<{
    id: string
    name: string
    input: any
  }>
}> {
  const { model, messages, system, maxTokens = 4096, temperature = 0.7, tools } = opts
  let endpoint = getEndpoint(model)
  const apiKey = process.env.OPENCODE_ZEN_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENCODE_ZEN_API_KEY')
  }

  let body: any

  if (endpoint === '/v1/messages') {
    body = {
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system && { system }),
      messages: messages.filter(m => m.role !== 'system'),
      ...(tools && { tools })
    }
  } else if (endpoint === '/v1/responses') {
    endpoint = '/v1/chat/completions'
    body = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages.filter(m => m.role !== 'system')
      ],
      ...(tools && {
        tools: tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        }))
      })
    }
  } else {
    body = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages.filter(m => m.role !== 'system')
      ],
      ...(tools && {
        tools: tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        }))
      })
    }
  }

  try {
    const res = await fetch(`${ZEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Zen API error (${res.status}): ${text}`)
    }

    const data = await res.json()

    if (endpoint === '/v1/messages') {
      // Anthropic format
      const textBlocks = data.content?.filter((b: any) => b.type === 'text') || []
      const toolUseBlocks = data.content?.filter((b: any) => b.type === 'tool_use') || []

      const text = textBlocks.map((b: any) => b.text).join('')
      const toolCalls = toolUseBlocks.map((b: any) => ({
        id: b.id,
        name: b.name,
        input: b.input
      }))

      return { text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
    } else {
      // OpenAI Chat Completions format
      const message = data.choices?.[0]?.message
      const text = message?.content || ''
      const toolCalls = message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments)
      }))

      return { text, toolCalls }
    }
  } catch (error: any) {
    throw error
  }
}

export const ZEN_MODELS = [
  // Free models
  { id: 'big-pickle', name: 'Big Pickle', category: 'Free', free: true },
  { id: 'gpt-5-nano', name: 'GPT 5 Nano', category: 'Free', free: true },
  { id: 'glm-4.7-free', name: 'GLM 4.7 Free', category: 'Free', free: true },
  { id: 'kimi-k2.5-free', name: 'Kimi K2.5 Free', category: 'Free', free: true },
  { id: 'minimax-m2.1-free', name: 'MiniMax M2.1 Free', category: 'Free', free: true },

  // Claude
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', category: 'Claude' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', category: 'Claude' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', category: 'Claude' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', category: 'Claude' },

  // GPT
  { id: 'gpt-5.2', name: 'GPT 5.2', category: 'GPT' },
  { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex', category: 'GPT' },
  { id: 'gpt-5.1-codex', name: 'GPT 5.1 Codex', category: 'GPT' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT 5.1 Codex Mini', category: 'GPT' },

  // Other
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', category: 'Gemini' },
  { id: 'qwen3-coder', name: 'Qwen3 Coder 480B', category: 'Other' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', category: 'Other' },
]
