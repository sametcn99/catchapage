import { chromium } from "playwright"
import type { CaptureOutcome } from "./captureOutcome"
import { joinPath } from "./joinPath"
import { config } from "./config"
import { DeviceContextFactory } from "./deviceContextFactory"
import { LinkCaptureTask } from "./linkCaptureTask"

export interface RunFolderObserver {
  onRunFolderReady(runFolder: string): void
}

interface PreparedLinkTask {
  url: string
  linkDir: string
  task: LinkCaptureTask
}

export class PageCaptureRunner {
  private static readonly DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  private readonly usedNames = new Set<string>()
  private readonly deviceContextFactory = new DeviceContextFactory()
  private readonly runFolderObservers: RunFolderObserver[] = []

  constructor(
    private readonly urls: string[],
    private readonly outputDir: string = config.DEFAULT_OUTPUT_DIR,
  ) {}

  async run(): Promise<CaptureOutcome[]> {
    const runStart = Date.now()
    console.log(
      `Starting capture run for ${this.urls.length} URL(s). Output root: ${this.outputDir}.`,
    )
    const runFolder = await this.prepareRunFolder()
    console.log(`Launching Chromium browser...`)
    const launchStart = Date.now()
    const browser = await chromium.launch(PageCaptureRunner.buildChromiumLaunchOptions())
    console.log(`Chromium launched in ${this.formatDuration(launchStart)}.`)
    let results: CaptureOutcome[] = []

    try {
      const preparedTasks = await this.prepareLinkTasks(browser, runFolder)
      console.log(`Prepared ${preparedTasks.length} link task(s).`)
      results = await this.execute(preparedTasks)
    } finally {
      console.log("Closing Chromium browser...")
      const closeStart = Date.now()
      await browser.close()
      console.log(`Browser closed in ${this.formatDuration(closeStart)}.`)
    }

    this.report(results, runFolder)
    console.log(`Capture run finished in ${this.formatDuration(runStart)}.`)
    return results
  }

  registerRunFolderObserver(observer: RunFolderObserver): void {
    this.runFolderObservers.push(observer)
  }

  private async prepareRunFolder(): Promise<string> {
    const timestamp = PageCaptureRunner.formatTimestamp(new Date())
    const runFolder = joinPath(process.cwd(), this.outputDir, timestamp)
    await this.ensureDir(runFolder)
    this.notifyRunFolderObservers(runFolder)
    console.log(`Run folder ready: ${runFolder}.`)
    return runFolder
  }

  private async prepareLinkTasks(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    runFolder: string,
  ): Promise<PreparedLinkTask[]> {
    const tasks: PreparedLinkTask[] = []

    for (const [index, url] of this.urls.entries()) {
      const linkDir = await this.prepareLinkDirectory(runFolder, url, index)
      const task = new LinkCaptureTask({
        browser,
        deviceContextFactory: this.deviceContextFactory,
        url,
        linkDir,
        parallelVariants: config.PARALLEL_CAPTURE_ENABLED,
      })
      tasks.push({ url, linkDir, task })
      console.log(
        `Queued capture task ${index + 1}/${this.urls.length} for ${url}. Variants: ${
          config.PARALLEL_CAPTURE_ENABLED ? "parallel" : "sequential"
        }.`,
      )
    }

    return tasks
  }

  private async execute(tasks: PreparedLinkTask[]): Promise<CaptureOutcome[]> {
    const runTask = async (entry: PreparedLinkTask) => {
      console.log(`→ Capturing ${entry.url} ...`)
      const outcome = await entry.task.run()

      if (outcome.success) {
        console.log(
          `✓ Saved capture for ${outcome.url}: ${outcome.folder} (desktop/tablet/mobile HTML & PNG artifacts).`,
        )
      } else {
        console.error(`✗ Error (${entry.url}): ${outcome.error}`)
      }

      return outcome
    }

    if (config.PARALLEL_CAPTURE_ENABLED) {
      return Promise.all(tasks.map((task) => runTask(task)))
    }

    const results: CaptureOutcome[] = []

    for (const task of tasks) {
      results.push(await runTask(task))
    }

    return results
  }

  private async prepareLinkDirectory(
    runFolder: string,
    url: string,
    index: number,
  ): Promise<string> {
    const folderName = this.slugifyUrl(url, index)
    const linkDir = joinPath(runFolder, folderName)
    await this.ensureDir(linkDir)
    console.log(`Ensured link folder ${linkDir} for ${url}.`)
    return linkDir
  }

  private async ensureDir(dir: string) {
    const result = Bun.spawnSync(["mkdir", "-p", dir])
    if (!result.success) {
      throw new Error(`Failed to create directory: ${dir}`)
    }
  }

  private slugifyUrl(rawUrl: string, index: number): string {
    let base = rawUrl

    try {
      const parsed = new URL(rawUrl)
      base = `${parsed.hostname}${parsed.pathname.replace(/\/$/, "")}`
      if (parsed.searchParams.toString()) {
        base += `?${parsed.searchParams.toString()}`
      }
    } catch {
      // Fall back to the original value when parsing fails.
    }

    const sanitized =
      base
        .replace(/https?:\/\//gi, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || `link-${index + 1}`

    let candidate = sanitized
    let suffix = 1

    while (this.usedNames.has(candidate)) {
      candidate = `${sanitized}-${suffix++}`
    }

    this.usedNames.add(candidate)
    return candidate
  }

  private static formatTimestamp(now: Date): string {
    const formatted = PageCaptureRunner.DATE_FORMATTER.format(now)
    // Replace locale-specific separators to keep folder name filesystem-friendly.
    const sanitized = formatted.replace(/[^0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return sanitized || now.getTime().toString()
  }

  private report(results: CaptureOutcome[], runFolder: string) {
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    console.log(
      `\nCapture finished. Success: ${successCount}, Failed: ${failureCount}. Output: ${runFolder}`,
    )

    if (failureCount > 0) {
      process.exitCode = 1
    }
  }

  private static buildChromiumLaunchOptions(): Parameters<typeof chromium.launch>[0] {
    const args: string[] = []

    const hostResolverRules = Array.from(config.CHROMIUM_HOST_RESOLVER_RULES)
      .map((rule) => rule.trim())
      .filter(Boolean)

    if (hostResolverRules.length > 0) {
      args.push(`--host-resolver-rules=${hostResolverRules.join(",")}`)
    }

    if (config.CHROMIUM_USE_CUSTOM_DNS) {
      const dnsServers = Array.from(config.CHROMIUM_DNS_SERVERS)
        .map((server) => server.trim())
        .filter(Boolean)

      if (dnsServers.length > 0) {
        args.push(`--dns-server=${dnsServers.join(",")}`)
      }
    }

    if (args.length === 0) {
      return {}
    }

    return { args }
  }

  private notifyRunFolderObservers(runFolder: string): void {
    for (const observer of this.runFolderObservers) {
      observer.onRunFolderReady(runFolder)
    }
  }

  private formatDuration(start: number): string {
    const elapsed = Math.max(0, Date.now() - start)
    return `${elapsed}ms`
  }
}
