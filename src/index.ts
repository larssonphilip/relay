import 'dotenv/config'
import { CLI } from './adapters/cli.js'

async function main() {
  const cli = new CLI()
  await cli.start()
}

main().catch(console.error)
