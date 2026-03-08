import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')
const frontendRoot = path.join(workspaceRoot, 'frontend')
const lockPath = path.join(frontendRoot, '.next', 'dev', 'lock')

function removeStaleLock() {
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath, { force: true })
    console.log('[dev-prepare] Removed stale Next.js lock file.')
  }
}

function getWindowsListeningPid(port) {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"`,
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim()

    if (!output) return null

    const pid = Number.parseInt(output, 10)
    return Number.isFinite(pid) ? pid : null
  } catch {
    return null
  }
}

function getWindowsCommandLine(pid) {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine"`,
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim()

    return output
  } catch {
    return ''
  }
}

function killWindowsProcess(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: ['ignore', 'pipe', 'pipe'] })
    console.log(`[dev-prepare] Stopped stale Next.js process on PID ${pid}.`)
  } catch {
    // Ignore failures so dev can still proceed.
  }
}

function cleanupWindowsNextPortConflict() {
  const pid = getWindowsListeningPid(3000)
  if (!pid) return

  const commandLine = getWindowsCommandLine(pid).toLowerCase()
  const isThisProjectsNextDev =
    commandLine.includes('next\\dist\\server\\lib\\start-server.js') &&
    commandLine.includes('stock_system\\frontend')

  if (isThisProjectsNextDev) {
    killWindowsProcess(pid)
  }
}

if (process.platform === 'win32') {
  cleanupWindowsNextPortConflict()
}

removeStaleLock()
