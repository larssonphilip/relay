import { z } from 'zod'
import { defineSkill, skillRegistry } from './index.js'

const HA_URL = process.env.HA_URL || 'http://homeassistant.local:8123'
const HA_TOKEN = process.env.HA_TOKEN

async function callHA(endpoint: string, method: string = 'GET', body?: any) {
  if (!HA_TOKEN) {
    throw new Error('HA_TOKEN not configured in .env')
  }

  const url = `${HA_URL}/api/${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      ...(body && { body: JSON.stringify(body) })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Home Assistant API error (${response.status}): ${text}`)
    }

    return await response.json()
  } catch (error: any) {
    if (error.cause) {
      throw new Error(`Cannot reach Home Assistant at ${url}: ${error.cause.message}. Check HA_URL in .env and ensure Home Assistant is running.`)
    }
    throw error
  }
}

const getStateParams = z.object({
  entity_id: z.string().describe('Entity ID (e.g., light.living_room, sensor.temperature)')
})

export const getStateSkill = defineSkill({
  name: 'ha_get_state',
  description: 'Get the current state of a Home Assistant entity. Use to check if lights are on/off, get sensor values, etc.',
  parameters: getStateParams,
  execute: async (params) => {
    try {
      const state = await callHA(`states/${params.entity_id}`)

      const output = `Entity: ${state.entity_id}
State: ${state.state}
Attributes: ${JSON.stringify(state.attributes, null, 2)}
Last Updated: ${new Date(state.last_updated).toLocaleString()}`

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

const callServiceParams = z.object({
  domain: z.string().describe('Service domain (e.g., light, switch, climate)'),
  service: z.string().describe('Service name (e.g., turn_on, turn_off, toggle)'),
  entity_id: z.string().describe('Entity ID to control'),
  data: z.record(z.any(), z.any()).optional().describe('Additional service data (e.g., brightness, color)')
})

export const callServiceSkill = defineSkill({
  name: 'ha_call_service',
  description: 'Call a Home Assistant service to control devices. Examples: turn on/off lights, set brightness, adjust thermostat.',
  parameters: callServiceParams,
  execute: async (params) => {
    try {
      const serviceData = {
        entity_id: params.entity_id,
        ...(params.data || {})
      }

      await callHA(`services/${params.domain}/${params.service}`, 'POST', serviceData)

      return {
        success: true,
        output: `Called ${params.domain}.${params.service} on ${params.entity_id}`
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

const listEntitiesParams = z.object({
  domain: z.string().optional().describe('Filter by domain (e.g., light, sensor, switch). Leave empty for all.')
})

export const listEntitiesSkill = defineSkill({
  name: 'ha_list_entities',
  description: 'List all entities in Home Assistant, optionally filtered by domain. Useful for discovering available devices.',
  parameters: listEntitiesParams,
  execute: async (params) => {
    try {
      const states = await callHA('states')

      let filtered = states
      if (params.domain) {
        filtered = states.filter((s: any) => s.entity_id.startsWith(`${params.domain}.`))
      }

      if (filtered.length === 0) {
        return {
          success: true,
          output: params.domain
            ? `No entities found in domain: ${params.domain}`
            : 'No entities found'
        }
      }

      const byDomain: Record<string, any[]> = {}
      filtered.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0]
        if (!byDomain[domain]) byDomain[domain] = []
        byDomain[domain].push(entity)
      })

      const output = Object.entries(byDomain)
        .map(([domain, entities]) => {
          const list = entities
            .map(e => `  - ${e.entity_id} (${e.state})`)
            .join('\n')
          return `${domain.toUpperCase()} (${entities.length}):\n${list}`
        })
        .join('\n\n')

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

skillRegistry.register(getStateSkill)
skillRegistry.register(callServiceSkill)
skillRegistry.register(listEntitiesSkill)
