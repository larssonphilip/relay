import { z } from 'zod'

export type Role = 'user' | 'assistant'

export interface Message {
  role: Role
  content: string
  timestamp: number
}

export interface SkillDefinition {
  name: string
  description: string
  parameters: z.ZodObject<any>
  execute: (params: any) => Promise<SkillResult>
}

export interface SkillResult {
  success: boolean
  output: string
  error?: string
}

export interface StoredFact {
  id: number
  content: string
  timestamp: number
}

export interface ConversationContext {
  recentMessages: Message[]
  relevantFacts: StoredFact[]
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string;[key: string]: any }>
}

export interface ClaudeToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}
