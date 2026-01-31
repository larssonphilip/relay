import { exec } from 'child_process'
import { promisify } from 'util'
import { z } from 'zod'
import { defineSkill, skillRegistry } from './index.js'

const execAsync = promisify(exec)

async function runGit(args: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`git ${args}`, {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    })
    return stdout.trim() || stderr.trim() || '(no output)'
  } catch (error: any) {
    if (error.code === 128) {
      throw new Error('Not a git repository')
    }
    throw new Error(error.message)
  }
}

const statusParams = z.object({
  short: z.coerce.boolean().optional().describe('Use short format (default: false)')
})

export const gitStatusSkill = defineSkill({
  name: 'git_status',
  description: 'Show the working tree status. Lists modified, staged, and untracked files.',
  parameters: statusParams,
  execute: async (params) => {
    try {
      const args = params.short ? 'status -s' : 'status'
      const output = await runGit(args)

      return {
        success: true,
        output
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

const logParams = z.object({
  count: z.coerce.number().optional().describe('Number of commits to show (default: 10)'),
  oneline: z.coerce.boolean().optional().describe('Show one line per commit (default: false)')
})

export const gitLogSkill = defineSkill({
  name: 'git_log',
  description: 'Show commit history. Use to see recent changes, commits, and authors.',
  parameters: logParams,
  execute: async (params) => {
    try {
      const count = params.count || 10
      const format = params.oneline ? '--oneline' : '--pretty=format:%h - %an, %ar : %s'
      const output = await runGit(`log -${count} ${format}`)

      return {
        success: true,
        output
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

const diffParams = z.object({
  file: z.string().optional().describe('Specific file to diff (optional)'),
  staged: z.coerce.boolean().optional().describe('Show staged changes instead of unstaged (default: false)')
})

export const gitDiffSkill = defineSkill({
  name: 'git_diff',
  description: 'Show changes in the working directory or staged area. Use to see what has been modified.',
  parameters: diffParams,
  execute: async (params) => {
    try {
      const stagedFlag = params.staged ? '--staged' : ''
      const file = params.file || ''
      const output = await runGit(`diff ${stagedFlag} ${file}`.trim())

      if (!output || output === '(no output)') {
        return {
          success: true,
          output: params.staged ? 'No staged changes' : 'No unstaged changes'
        }
      }

      return {
        success: true,
        output
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

const showParams = z.object({
  ref: z.string().describe('Commit hash, branch name, or tag to show')
})

export const gitShowSkill = defineSkill({
  name: 'git_show',
  description: 'Show details of a specific commit, branch, or tag.',
  parameters: showParams,
  execute: async (params) => {
    try {
      const output = await runGit(`show ${params.ref}`)

      return {
        success: true,
        output
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

const branchParams = z.object({
  all: z.coerce.boolean().optional().describe('Show all branches including remote (default: false)')
})

export const gitBranchSkill = defineSkill({
  name: 'git_branch',
  description: 'List all branches. Shows current branch with an asterisk.',
  parameters: branchParams,
  execute: async (params) => {
    try {
      const args = params.all ? 'branch -a' : 'branch'
      const output = await runGit(args)

      return {
        success: true,
        output
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

skillRegistry.register(gitStatusSkill)
skillRegistry.register(gitLogSkill)
skillRegistry.register(gitDiffSkill)
skillRegistry.register(gitShowSkill)
skillRegistry.register(gitBranchSkill)
