// Copies the hand-customized service/fixture files onto the freshly
// generated mock-server/ (see package.json's generate:mock, and
// e2e/mock-server-overrides/ for what actually gets copied). mock-server/
// itself is gitignored and regenerated from api.yaml, so these overrides are
// the only durable, committed source of the E2E fixture logic.
const fs = require('fs')
const path = require('path')

const OVERRIDES_DIR = path.join(__dirname, 'mock-server-overrides')
const MOCK_SERVER_DIR = path.join(__dirname, '..', 'mock-server')

function copyRecursive(src, dest) {
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, {recursive: true})
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (!fs.existsSync(MOCK_SERVER_DIR)) {
  console.error(`mock-server/ not found — run "pnpm generate:mock" first.`)
  process.exit(1)
}

copyRecursive(OVERRIDES_DIR, MOCK_SERVER_DIR)
console.log('Applied mock server overrides from e2e/mock-server-overrides/')
