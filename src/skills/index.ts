import { z } from 'zod'
import type { SkillDefinition, SkillResult } from '../core/types.js'

class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map()

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill ${skill.name} is already registered`)
    }
    this.skills.set(skill.name, skill)
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name)
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values())
  }

  async execute(name: string, params: any): Promise<SkillResult> {
    const skill = this.get(name)

    if (!skill) {
      return {
        success: false,
        output: '',
        error: `Skill not found: ${name}`
      }
    }

    try {
      const validated = skill.parameters.parse(params)
      return await skill.execute(validated)
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `Parameter validation failed: ${error.message}`
      }
    }
  }

  toToolDefinitions(): Array<{
    name: string
    description: string
    input_schema: any
  }> {
    return this.getAll().map(skill => ({
      name: skill.name,
      description: skill.description,
      input_schema: zodToJsonSchema(skill.parameters)
    }))
  }
}

export const skillRegistry = new SkillRegistry()

export function defineSkill<T extends z.ZodObject<any>>(config: {
  name: string
  description: string
  parameters: T
  execute: (params: z.infer<T>) => Promise<SkillResult>
}): SkillDefinition {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute
  }
}

function zodToJsonSchema(schema: z.ZodObject<any>): any {
  const shape = schema.shape
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny

    if (zodType instanceof z.ZodString) {
      properties[key] = { type: 'string' }
    } else if (zodType instanceof z.ZodNumber) {
      properties[key] = { type: 'number' }
    } else if (zodType instanceof z.ZodBoolean) {
      properties[key] = { type: 'boolean' }
    } else if (zodType instanceof z.ZodArray) {
      properties[key] = { type: 'array', items: { type: 'string' } }
    } else {
      properties[key] = { type: 'string' }
    }

    if (zodType.description) {
      properties[key].description = zodType.description
    }

    if (!(zodType instanceof z.ZodOptional)) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    required
  }
}
