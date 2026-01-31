import 'dotenv/config'
import { CLI } from './adapters/cli'

import './skills/shell'
import './skills/files'
import './skills/homeassistant'
import './skills/git'

async function main() {
  const cli = new CLI()
  await cli.start()
}

main().catch(console.error)
