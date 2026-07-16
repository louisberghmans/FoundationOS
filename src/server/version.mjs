import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const packageMetadata = JSON.parse(readFileSync(join(moduleDir, '..', '..', 'package.json'), 'utf8'))

export const APP_VERSION = packageMetadata.version
