import { z } from 'zod'

export type Role = 'user' | 'assistant'

export interface Message {
  role: Role
  content: string
  timestamp: number
}

export interface AgentConfig {
  model: string
  maxTokens?: number
  temperature?: number
}

export const DEFAULT_MODEL = 'big-pickle'

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
