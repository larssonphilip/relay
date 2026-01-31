import { exec } from 'child_process'
import { promisify } from 'util'
import { z } from 'zod'
import { defineSkill, skillRegistry } from './index.js'

const execAsync = promisify(exec)

const BLOCKLIST = [
  'rm -rf',
  'sudo',
  'dd',
  'mkfs',
  'format',
  ':(){:|:&};:',
  '> /dev/sda',
  'chmod -R 777 /',
  'curl | sh',
  'wget | sh'
]

const params = z.object({
  command: z.string().describe('Shell command to execute')
})

export const shellSkill = defineSkill({
  name: 'shell',
  description: 'Execute shell commands. Use for running terminal commands, checking status, listing files, etc. Blocked: destructive operations (rm -rf, sudo, dd, mkfs).',
  parameters: params,
  execute: async (params) => {
    const { command } = params

    const commandLower = command.toLowerCase()
    for (const blocked of BLOCKLIST) {
      if (commandLower.includes(blocked.toLowerCase())) {
        return {
          success: false,
          output: '',
          error: `Blocked command: "${blocked}" is not allowed for safety`
        }
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024
      })

      const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')

      return {
        success: true,
        output: output.trim() || '(no output)'
      }
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message
      }
    }
  }
})

skillRegistry.register(shellSkill)
