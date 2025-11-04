import type { Browser, BrowserContextOptions, Page, Response } from "playwright"
import { config } from "./config"
import { joinPath } from "./joinPath"

// cspell:ignore networkidle domcontentloaded

type NavigationWaitUntil = NonNullable<Parameters<Page["goto"]>[1]>["waitUntil"]

type NavigationStrategy = {
  waitUntil: NavigationWaitUntil
  timeout: number
}

type DomRectLike = {
  width: number
  height: number
}

type DomElementLike = {
  innerText?: string
  querySelector?: (selector: string) => DomElementLike | null
  getBoundingClientRect?: () => DomRectLike
}

type DocumentLike = {
  body?: DomElementLike | null
}

export interface VariantCaptureConfig {
  browser: Browser
  url: string
  linkDir: string
  htmlFileName: string
  screenshotFileName: string
  variantLabel: string
  contextOptions: BrowserContextOptions
}

export class VariantCaptureTask {
  private static readonly NAVIGATION_STRATEGIES: ReadonlyArray<NavigationStrategy> = [
    { waitUntil: "networkidle", timeout: config.PRIMARY_NAVIGATION_TIMEOUT_MS },
    { waitUntil: "domcontentloaded", timeout: config.FALLBACK_NAVIGATION_TIMEOUT_MS },
  ]

  constructor(private readonly config: VariantCaptureConfig) {}

  async run(): Promise<void> {
    const taskStart = Date.now()
    this.logInfo(`Starting capture for ${this.config.url} (output: ${this.config.linkDir}).`)

    const html = await this.withContext(async (page) => {
      await this.navigateWithFallback(page)
      if (config.POST_NAVIGATION_IDLE_MS > 0) {
        this.logInfo(
          `Waiting ${config.POST_NAVIGATION_IDLE_MS}ms after navigation to allow the page to settle...`,
        )
        const idleWaitStart = Date.now()
        await page.waitForTimeout(config.POST_NAVIGATION_IDLE_MS)
        this.logInfo(`Post-navigation idle wait complete (${this.formatDuration(idleWaitStart)}).`)
      } else {
        this.logInfo("Skipping post-navigation idle wait (disabled).")
      }
      await this.waitForStabilization(page)
      await this.waitForMeaningfulContent(page)
      this.logInfo("Capturing screenshot...")
      const screenshotStart = Date.now()
      await page.screenshot({
        path: joinPath(this.config.linkDir, this.config.screenshotFileName),
        fullPage: true,
      })
      this.logInfo(
        `Screenshot saved to ${joinPath(this.config.linkDir, this.config.screenshotFileName)} ` +
          `(${this.formatDuration(screenshotStart)}).`,
      )
      return page.content()
    })

    this.logInfo("Writing HTML snapshot to disk...")
    const writeStart = Date.now()
    await Bun.write(joinPath(this.config.linkDir, this.config.htmlFileName), html)
    this.logInfo(
      `Stored HTML snapshot (${html.length} characters) in ${this.formatDuration(writeStart)}.`,
    )
    this.logInfo(`Capture finished in ${this.formatDuration(taskStart)}.`)
  }

  private async withContext<T>(handler: (page: Page) => Promise<T>): Promise<T> {
    this.logInfo("Creating browser context for variant...")
    const contextStart = Date.now()
    const context = await this.config.browser.newContext(this.config.contextOptions)
    this.logInfo(`Context ready (${this.formatDuration(contextStart)}).`)

    try {
      const pageStart = Date.now()
      const page = await context.newPage()
      this.logInfo(`Page ready (${this.formatDuration(pageStart)}).`)

      try {
        const result = await handler(page)
        this.logInfo("Closing page...")
        const closeStart = Date.now()
        await page.close()
        this.logInfo(`Page closed (${this.formatDuration(closeStart)}).`)
        return result
      } finally {
        // Ensure we close the page if handler throws before explicit close.
        if (!page.isClosed()) {
          const fallbackCloseStart = Date.now()
          await page.close()
          this.logInfo(`Page closed after failure (${this.formatDuration(fallbackCloseStart)}).`)
        }
      }
    } finally {
      this.logInfo("Closing browser context...")
      const closeStart = Date.now()
      await context.close()
      this.logInfo(`Context closed (${this.formatDuration(closeStart)}).`)
    }
  }

  private async navigateWithFallback(page: Page) {
    let lastError: unknown

    for (const [index, strategy] of VariantCaptureTask.NAVIGATION_STRATEGIES.entries()) {
      const attemptStart = Date.now()

      try {
        this.logInfo(
          `Navigation attempt ${index + 1} using waitUntil=${strategy.waitUntil} with timeout=${strategy.timeout}ms...`,
        )
        const response = await page.goto(this.config.url, strategy)
        this.validateNavigationResponse(response, this.formatDuration(attemptStart))

        if (index > 0) {
          this.logWarn(
            `Navigation fallback succeeded using waitUntil=${strategy.waitUntil} (${this.formatDuration(attemptStart)}).`,
          )
        } else {
          this.logInfo(`Navigation succeeded (${this.formatDuration(attemptStart)}).`)
        }

        return
      } catch (error) {
        lastError = error
        const attemptDuration = this.formatDuration(attemptStart)
        const reason = error instanceof Error ? error.message : String(error)
        this.logWarn(`Navigation attempt ${index + 1} failed in ${attemptDuration}: ${reason}.`)

        if (index < VariantCaptureTask.NAVIGATION_STRATEGIES.length - 1) {
          this.logWarn(
            `Retrying with fallback strategy (next waitUntil=${VariantCaptureTask.NAVIGATION_STRATEGIES[index + 1]?.waitUntil ?? "n/a"}).`,
          )
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    throw new Error(`Navigation failed for ${this.config.url}.`)
  }

  private async waitForStabilization(page: Page) {
    if (config.CAPTURE_STABILIZATION_DELAY_MS <= 0) {
      this.logInfo("Skipping stabilization wait (disabled).")
      return
    }

    this.logInfo(
      `Waiting ${config.CAPTURE_STABILIZATION_DELAY_MS}ms for stabilization after initial idle delay...`,
    )
    const waitStart = Date.now()
    await page.waitForTimeout(config.CAPTURE_STABILIZATION_DELAY_MS)
    this.logInfo(`Stabilization wait complete (${this.formatDuration(waitStart)}).`)
  }

  private async waitForMeaningfulContent(page: Page) {
    if (config.CONTENT_READY_TIMEOUT_MS <= 0) {
      this.logInfo("Skipping meaningful content wait (disabled).")
      return
    }

    const waitStart = Date.now()
    this.logInfo(
      `Waiting for meaningful content (timeout: ${config.CONTENT_READY_TIMEOUT_MS}ms)...`,
    )

    try {
      await page.waitForFunction(
        () => {
          const doc = (globalThis as { document?: DocumentLike }).document
          const body = doc?.body ?? null

          if (!body) {
            return false
          }

          const textContent = (body.innerText ?? "").trim()

          if (textContent.length > 0) {
            return true
          }

          const querySelector = body.querySelector ?? null
          const meaningfulElement = querySelector
            ? querySelector("img, video, iframe, canvas, svg, picture, main, article, section, div")
            : null

          if (!meaningfulElement) {
            return false
          }

          const meaningfulText = (meaningfulElement.innerText ?? "").trim()

          if (meaningfulText.length > 0) {
            return true
          }

          const rect = meaningfulElement.getBoundingClientRect?.()
          return Boolean(rect && rect.width > 0 && rect.height > 0)
        },
        { timeout: config.CONTENT_READY_TIMEOUT_MS },
      )
      this.logInfo(`Meaningful content detected (${this.formatDuration(waitStart)}).`)
    } catch {
      this.logWarn(`Meaningful content not detected within ${config.CONTENT_READY_TIMEOUT_MS}ms.`)
      throw new Error(
        `Page content did not become ready for ${this.config.url} within ${config.CONTENT_READY_TIMEOUT_MS}ms.`,
      )
    }
  }

  private validateNavigationResponse(response: Response | null, duration: string) {
    if (!response) {
      this.logInfo(`Navigation completed without HTTP response (${duration}).`)
      return
    }

    const status = response.status()

    if (status >= 400) {
      const statusText = response.statusText()
      throw new Error(
        `Navigation failed for ${this.config.url}: HTTP ${status}${statusText ? ` ${statusText}` : ""}.`,
      )
    }

    this.logInfo(
      `Received HTTP ${status}${
        response.statusText() ? ` ${response.statusText()}` : ""
      } (${duration}).`,
    )
  }

  private formatDuration(start: number): string {
    const elapsed = Math.max(0, Date.now() - start)
    return `${elapsed}ms`
  }

  private logInfo(message: string) {
    console.log(this.buildLogMessage(message))
  }

  private logWarn(message: string) {
    console.warn(this.buildLogMessage(message))
  }

  private buildLogMessage(message: string): string {
    return `[${this.config.variantLabel}] [${this.config.url}] ${message}`
  }

  getVariantLabel(): string {
    return this.config.variantLabel
  }
}
