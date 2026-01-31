import { readFile, writeFile, appendFile } from 'fs/promises'
import { z } from 'zod'
import { defineSkill, skillRegistry } from './index.js'

const readParams = z.object({
  path: z.string().describe('Path to the file to read'),
  start_line: z.number().optional().describe('Start line (1-indexed, optional)'),
  end_line: z.number().optional().describe('End line (1-indexed, optional)')
})

const writeParams = z.object({
  path: z.string().describe('Path to the file to write'),
  content: z.string().describe('Content to write to the file')
})

export const readFileSkill = defineSkill({
  name: 'read_file',
  description: 'Read contents of a file. Can optionally specify line range.',
  parameters: readParams,
  execute: async (params) => {
    try {
      const content = await readFile(params.path, 'utf-8')

      if (params.start_line || params.end_line) {
        const lines = content.split('\n')
        const start = (params.start_line || 1) - 1
        const end = params.end_line || lines.length
        const selectedLines = lines.slice(start, end)

        return {
          success: true,
          output: selectedLines.join('\n')
        }
      }

      return {
        success: true,
        output: content
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message
      }
    }
  }
})

export const writeFileSkill = defineSkill({
  name: 'write_file',
  description: 'Write content to a file (creates or overwrites). Use for creating new files or replacing content.',
  parameters: writeParams,
  execute: async (params) => {
    try {
      await writeFile(params.path, params.content, 'utf-8')

      return {
        success: true,
        output: `Successfully wrote ${params.content.length} characters to ${params.path}`
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message
      }
    }
  }
})

skillRegistry.register(readFileSkill)
skillRegistry.register(writeFileSkill)
