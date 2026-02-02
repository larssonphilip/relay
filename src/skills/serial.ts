import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { z } from 'zod'
import { defineSkill, skillRegistry } from './index.js'

const homeDir = process.env.HOME || process.env.USERPROFILE || '~'
const SERIAL_LOGS_DIR = path.join(homeDir, 'serial_logs')

const listParams = z.object({})

export const listSerialSkill = defineSkill({
  name: 'serial_list',
  description: 'List available serial port log files. Shows which ports have been logged.',
  parameters: listParams,
  execute: async () => {
    try {
      if (!existsSync(SERIAL_LOGS_DIR)) {
        return {
          success: true,
          output: `No serial logs directory found at ${SERIAL_LOGS_DIR}\n\nTo start logging:\n  screen /dev/ttyUSB0 115200 | tee ~/serial_logs/ttyUSB0.log`
        }
      }

      const { readdir } = await import('fs/promises')
      const files = await readdir(SERIAL_LOGS_DIR)
      const logFiles = files.filter(f => f.endsWith('.log'))

      if (logFiles.length === 0) {
        return {
          success: true,
          output: `No log files found in ${SERIAL_LOGS_DIR}\n\nTo start logging:\n  screen /dev/ttyUSB0 115200 | tee ~/serial_logs/ttyUSB0.log`
        }
      }

      const fileList = logFiles.map(f => `  - ${f}`).join('\n')
      return {
        success: true,
        output: `Serial log files:\n${fileList}\n\nLocation: ${SERIAL_LOGS_DIR}`
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

const readParams = z.object({
  port: z.string().describe('Serial port name (e.g., ttyUSB0, ttyACM0)'),
  lines: z.coerce.number().optional().describe('Number of lines to read from end (default: 50)'),
  search: z.string().optional().describe('Filter lines containing this text (optional)')
})

export const readSerialSkill = defineSkill({
  name: 'serial_read',
  description: 'Read serial port log file. Shows recent output from ESP32, Arduino, etc. Port should be like "ttyUSB0" or "ttyACM0".',
  parameters: readParams,
  execute: async (params) => {
    try {
      const { port, lines = 50, search } = params

      // Clean port name (remove /dev/ if present)
      const portName = port.replace(/^\/dev\//, '')
      const logPath = path.join(SERIAL_LOGS_DIR, `${portName}.log`)

      if (!existsSync(logPath)) {
        return {
          success: false,
          output: '',
          error: `No log file found for ${portName}\n\nExpected: ${logPath}\n\nTo start logging:\n  screen /dev/${portName} 115200 | tee ~/serial_logs/${portName}.log`
        }
      }

      const content = await readFile(logPath, 'utf-8')
      let logLines = content.split('\n').filter(line => line.trim())

      // Filter by search term if provided
      if (search) {
        logLines = logLines.filter(line =>
          line.toLowerCase().includes(search.toLowerCase())
        )
      }

      // Get last N lines
      const recentLines = logLines.slice(-lines)

      if (recentLines.length === 0) {
        return {
          success: true,
          output: search
            ? `No lines matching "${search}" found in ${portName}.log`
            : `Log file is empty: ${portName}.log`
        }
      }

      const header = search
        ? `Last ${recentLines.length} lines matching "${search}" from ${portName}:`
        : `Last ${recentLines.length} lines from ${portName}:`

      return {
        success: true,
        output: `${header}\n\n${recentLines.join('\n')}`
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

const watchParams = z.object({
  port: z.string().describe('Serial port name (e.g., ttyUSB0)'),
  since_seconds: z.coerce.number().optional().describe('Only show lines from last N seconds (default: 10)')
})

export const watchSerialSkill = defineSkill({
  name: 'serial_watch',
  description: 'Get the very latest serial output from a port. Useful for real-time debugging.',
  parameters: watchParams,
  execute: async (params) => {
    try {
      const { port, since_seconds = 10 } = params
      const portName = port.replace(/^\/dev\//, '')
      const logPath = path.join(SERIAL_LOGS_DIR, `${portName}.log`)

      if (!existsSync(logPath)) {
        return {
          success: false,
          output: '',
          error: `No log file found for ${portName}`
        }
      }

      const { stat } = await import('fs/promises')
      const stats = await stat(logPath)
      const cutoffTime = Date.now() - (since_seconds * 1000)

      if (stats.mtimeMs < cutoffTime) {
        return {
          success: true,
          output: `No recent output from ${portName} (last modified ${Math.round((Date.now() - stats.mtimeMs) / 1000)}s ago)`
        }
      }

      const content = await readFile(logPath, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())
      const recentLines = lines.slice(-100)

      return {
        success: true,
        output: `Recent output from ${portName}:\n\n${recentLines.join('\n')}`
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

skillRegistry.register(listSerialSkill)
skillRegistry.register(readSerialSkill)
skillRegistry.register(watchSerialSkill)
