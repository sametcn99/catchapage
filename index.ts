import { PageCaptureRunner } from "./src/pageCaptureRunner"
import { loadUrlsFromFile } from "./src/loadUrlsFromFile"
import { config } from "./src/config"
import { FileLogger, RunFolderLoggingObserver } from "./src/fileLogger"

const originalConsoleLog = console.log.bind(console)
const originalConsoleWarn = console.warn.bind(console)
const originalConsoleError = console.error.bind(console)
const fileLogger = FileLogger.getInstance()
const runFolderObserver = new RunFolderLoggingObserver(fileLogger)

console.log = (...args: unknown[]) => {
  originalConsoleLog(...args)
  fileLogger.record("log", args)
}

console.warn = (...args: unknown[]) => {
  originalConsoleWarn(...args)
  fileLogger.record("warn", args)
}

console.error = (...args: unknown[]) => {
  originalConsoleError(...args)
  fileLogger.record("error", args)
}

async function main() {
  let urls: string[]

  try {
    urls = await loadUrlsFromFile(config.LINKS_FILE)
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to load links from links.txt.")
    process.exit(1)
    return
  }

  const runner = new PageCaptureRunner(urls)
  runner.registerRunFolderObserver(runFolderObserver)
  await runner.run()
}

main().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})
