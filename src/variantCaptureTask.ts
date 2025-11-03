import type { Browser, BrowserContextOptions, Page, Response } from "playwright"
import {
  CAPTURE_STABILIZATION_DELAY_MS,
  CONTENT_READY_TIMEOUT_MS,
  FALLBACK_NAVIGATION_TIMEOUT_MS,
  POST_NAVIGATION_IDLE_MS,
  PRIMARY_NAVIGATION_TIMEOUT_MS,
} from "./config"
import { joinPath } from "./joinPath"

type NavigationWaitUntil = NonNullable<Parameters<Page["goto"]>[1]>["waitUntil"]

type NavigationStrategy = {
  waitUntil: NavigationWaitUntil
  timeout: number
}

export interface VariantCaptureConfig {
  browser: Browser
  url: string
  linkDir: string
  htmlFileName: string
  screenshotFileName: string
  contextOptions: BrowserContextOptions
}

export class VariantCaptureTask {
  private static readonly NAVIGATION_STRATEGIES: ReadonlyArray<NavigationStrategy> = [
    { waitUntil: "networkidle", timeout: PRIMARY_NAVIGATION_TIMEOUT_MS },
    { waitUntil: "domcontentloaded", timeout: FALLBACK_NAVIGATION_TIMEOUT_MS },
  ]

  constructor(private readonly config: VariantCaptureConfig) {}

  async run(): Promise<void> {
    const html = await this.withContext(async (page) => {
      await this.navigateWithFallback(page)
      await page.waitForTimeout(POST_NAVIGATION_IDLE_MS)
      await VariantCaptureTask.waitForStabilization(page)
      await VariantCaptureTask.waitForMeaningfulContent(page, this.config.url)
      await page.screenshot({
        path: joinPath(this.config.linkDir, this.config.screenshotFileName),
        fullPage: true,
      })
      return page.content()
    })

    await Bun.write(joinPath(this.config.linkDir, this.config.htmlFileName), html)
  }

  private async withContext<T>(handler: (page: Page) => Promise<T>): Promise<T> {
    const context = await this.config.browser.newContext(this.config.contextOptions)

    try {
      const page = await context.newPage()

      try {
        return await handler(page)
      } finally {
        await page.close()
      }
    } finally {
      await context.close()
    }
  }

  private async navigateWithFallback(page: Page) {
    let lastError: unknown

    for (const [index, strategy] of VariantCaptureTask.NAVIGATION_STRATEGIES.entries()) {
      try {
        const response = await page.goto(this.config.url, strategy)
        VariantCaptureTask.validateNavigationResponse(this.config.url, response)

        if (index > 0) {
          console.warn(
            `Navigation fallback succeeded for ${this.config.url} using waitUntil=${strategy.waitUntil}.`,
          )
        }

        return
      } catch (error) {
        lastError = error

        if (index < VariantCaptureTask.NAVIGATION_STRATEGIES.length - 1) {
          console.warn(
            `Navigation attempt failed for ${this.config.url} with waitUntil=${strategy.waitUntil}. Retrying with fallback...`,
          )
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    throw new Error(`Navigation failed for ${this.config.url}.`)
  }

  private static async waitForStabilization(page: Page) {
    if (CAPTURE_STABILIZATION_DELAY_MS <= 0) {
      return
    }

    await page.waitForTimeout(CAPTURE_STABILIZATION_DELAY_MS)
  }

  private static async waitForMeaningfulContent(page: Page, url: string) {
    if (CONTENT_READY_TIMEOUT_MS <= 0) {
      return
    }

    try {
      await page.waitForFunction(
        () => {
          const body = document.body

          if (!body) {
            return false
          }

          const textContent = body.innerText?.trim()

          if (textContent) {
            return true
          }

          const meaningfulElement = body.querySelector(
            "img, video, iframe, canvas, svg, picture, main, article, section, div",
          )

          if (!meaningfulElement) {
            return false
          }

          if (meaningfulElement instanceof HTMLElement) {
            const text = meaningfulElement.innerText.trim()

            if (text.length > 0) {
              return true
            }

            const rect = meaningfulElement.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          }

          return true
        },
        { timeout: CONTENT_READY_TIMEOUT_MS },
      )
    } catch {
      throw new Error(
        `Page content did not become ready for ${url} within ${CONTENT_READY_TIMEOUT_MS}ms.`,
      )
    }
  }

  private static validateNavigationResponse(url: string, response: Response | null) {
    if (!response) {
      return
    }

    const status = response.status()

    if (status >= 400) {
      const statusText = response.statusText()
      throw new Error(
        `Navigation failed for ${url}: HTTP ${status}${statusText ? ` ${statusText}` : ""}.`,
      )
    }
  }
}
