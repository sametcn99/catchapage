import type { Browser } from "playwright"
import { CaptureOutcome } from "./captureOutcome"
import type { DeviceContextFactory } from "./deviceContextFactory"
import { VariantCaptureTask } from "./variantCaptureTask"

export interface LinkCaptureTaskConfig {
  browser: Browser
  deviceContextFactory: DeviceContextFactory
  url: string
  linkDir: string
  parallelVariants: boolean
}

export class LinkCaptureTask {
  constructor(private readonly config: LinkCaptureTaskConfig) {}

  async run(): Promise<CaptureOutcome> {
    const linkStart = Date.now()
    this.logInfo(
      `Starting capture for ${this.config.url} into ${this.config.linkDir} (${this.config.parallelVariants ? "parallel" : "sequential"} variants).`,
    )

    try {
      const tasks = this.createVariantTasks()

      if (this.config.parallelVariants) {
        await Promise.all(tasks.map((task) => task.run()))
      } else {
        for (const task of tasks) {
          this.logInfo(`Running variant ${task.getVariantLabel()} sequentially...`)
          await task.run()
        }
      }

      this.logInfo(`Finished link capture in ${this.formatDuration(linkStart)}.`)
      return CaptureOutcome.ok(this.config.url, this.config.linkDir)
    } catch (error) {
      this.logWarn(
        `Capture failed after ${this.formatDuration(linkStart)}: ${
          error instanceof Error ? error.message : String(error)
        }.`,
      )
      return CaptureOutcome.fail(this.config.url, this.config.linkDir, error)
    }
  }

  private createVariantTasks(): VariantCaptureTask[] {
    const factory = this.config.deviceContextFactory

    return [
      new VariantCaptureTask({
        browser: this.config.browser,
        url: this.config.url,
        linkDir: this.config.linkDir,
        htmlFileName: "page.desktop.html",
        screenshotFileName: "page.desktop.png",
        variantLabel: "Desktop",
        contextOptions: factory.buildDesktopContextOptions(),
      }),
      new VariantCaptureTask({
        browser: this.config.browser,
        url: this.config.url,
        linkDir: this.config.linkDir,
        htmlFileName: "page.tablet.html",
        screenshotFileName: "page.tablet.png",
        variantLabel: "Tablet",
        contextOptions: factory.buildTabletContextOptions(),
      }),
      new VariantCaptureTask({
        browser: this.config.browser,
        url: this.config.url,
        linkDir: this.config.linkDir,
        htmlFileName: "page.mobile.html",
        screenshotFileName: "page.mobile.png",
        variantLabel: "Mobile",
        contextOptions: factory.buildMobileContextOptions(),
      }),
    ]
  }

  private formatDuration(start: number): string {
    const elapsed = Math.max(0, Date.now() - start)
    return `${elapsed}ms`
  }

  private logInfo(message: string) {
    console.log(`[Link] ${message}`)
  }

  private logWarn(message: string) {
    console.warn(`[Link] ${message}`)
  }
}
