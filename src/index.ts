import 'dotenv/config'
import { Memory } from './core/memory.js'
import consola from 'consola'

async function main() {
  consola.box('Assistant - Memory Test')

  const memory = new Memory()

  // Test 1: Save some messages
  consola.info('Saving test messages...')

  memory.saveMessage({
    role: 'user',
    content: 'Hello! I need help with an ESP32 project.',
    timestamp: Date.now()
  })

  memory.saveMessage({
    role: 'assistant',
    content: 'Sure! What do you need help with?',
    timestamp: Date.now()
  })

  memory.saveMessage({
    role: 'user',
    content: 'GPIO 23 is connected to a relay for the bedroom lights.',
    timestamp: Date.now()
  })

  // Test 2: Retrieve messages
  consola.info('\nRecent messages:')
  const messages = memory.getRecentMessages()
  messages.forEach(msg => {
    consola.log(`[${msg.role}]: ${msg.content}`)
  })

  // Test 3: Save a fact
  consola.info('\nSaving fact...')
  memory.saveFact('GPIO 23 → relay → bedroom lights')
  memory.saveFact('ESP32 baud rate: 115200')

  // Test 4: Search facts
  consola.info('\nSearching for "GPIO"...')
  const facts = memory.searchFacts('GPIO')
  facts.forEach(fact => {
    consola.success(`• ${fact.content}`)
  })

  // Test 5: Get context
  consola.info('\nGetting conversation context...')
  const context = memory.getContext('ESP32')
  consola.info(`Messages: ${context.recentMessages.length}`)
  consola.info(`Relevant facts: ${context.relevantFacts.length}`)

  memory.close()
  consola.success('\n✓ Memory test complete!')
  consola.info('Database created at: data/memory.db')
}

main().catch(console.error)
