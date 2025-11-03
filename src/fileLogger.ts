import { mkdirSync, appendFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { inspect } from "node:util"
import type { RunFolderObserver } from "./pageCaptureRunner"

export class FileLogger {
  private static instance: FileLogger | null = null
  private logFilePath: string | null = null
  private readonly pendingLines: string[] = []

  private constructor() {}

  static getInstance(): FileLogger {
    if (FileLogger.instance === null) {
      FileLogger.instance = new FileLogger()
    }
    return FileLogger.instance
  }

  record(level: "log" | "warn" | "error", args: unknown[]): void {
    const formattedLine = `[${this.formatTime(new Date())}] [${level.toUpperCase()}] ${this.stringifyArgs(args)}`
    if (this.logFilePath === null) {
      this.pendingLines.push(formattedLine)
      return
    }

    if (this.pendingLines.length > 0) {
      this.flushPending()
    }

    appendFileSync(this.logFilePath, `${formattedLine}\n`, "utf8")
  }

  attachTo(runFolder: string): void {
    if (!existsSync(runFolder)) {
      mkdirSync(runFolder, { recursive: true })
    }

    if (this.logFilePath === null) {
      this.logFilePath = join(runFolder, this.createLogFileName())
    }

    if (this.pendingLines.length > 0) {
      this.flushPending()
    }
  }

  private flushPending(): void {
    if (this.logFilePath === null || this.pendingLines.length === 0) {
      return
    }

    const batch = this.pendingLines.join("\n")
    this.pendingLines.length = 0
    appendFileSync(this.logFilePath, `${batch}\n`, "utf8")
  }

  private createLogFileName(): string {
    return `console.log`
  }

  private formatTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, "0")
    const minutes = `${date.getMinutes()}`.padStart(2, "0")
    const seconds = `${date.getSeconds()}`.padStart(2, "0")
    const millis = `${date.getMilliseconds()}`.padStart(3, "0")
    return `${hours}:${minutes}:${seconds}.${millis}`
  }

  private stringifyArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "string") {
          return arg
        }
        return inspect(arg, { depth: null, colors: false })
      })
      .join(" ")
  }
}

export class RunFolderLoggingObserver implements RunFolderObserver {
  constructor(private readonly logger: FileLogger) {}

  onRunFolderReady(runFolder: string): void {
    this.logger.attachTo(runFolder)
  }
}
