import 'dotenv/config'
import { CLI } from './adapters/cli.js'

import './skills/shell.js'
import './skills/files.js'
import './skills/homeassistant.js'

async function main() {
  const cli = new CLI()
  await cli.start()
}

main().catch(console.error)
