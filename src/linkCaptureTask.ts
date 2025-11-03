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
    try {
      const tasks = this.createVariantTasks()

      if (this.config.parallelVariants) {
        await Promise.all(tasks.map((task) => task.run()))
      } else {
        for (const task of tasks) {
          await task.run()
        }
      }

      return CaptureOutcome.ok(this.config.url, this.config.linkDir)
    } catch (error) {
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
        contextOptions: factory.buildDesktopContextOptions(),
      }),
      new VariantCaptureTask({
        browser: this.config.browser,
        url: this.config.url,
        linkDir: this.config.linkDir,
        htmlFileName: "page.tablet.html",
        screenshotFileName: "page.tablet.png",
        contextOptions: factory.buildTabletContextOptions(),
      }),
      new VariantCaptureTask({
        browser: this.config.browser,
        url: this.config.url,
        linkDir: this.config.linkDir,
        htmlFileName: "page.mobile.html",
        screenshotFileName: "page.mobile.png",
        contextOptions: factory.buildMobileContextOptions(),
      }),
    ]
  }
}
