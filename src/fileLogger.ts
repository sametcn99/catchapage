import type { FileSink } from "bun"
import type { RunFolderObserver } from "./pageCaptureRunner"
import { joinPath } from "./joinPath"

export class FileLogger {
  private static instance: FileLogger | null = null
  private logFilePath: string | null = null
  private logSink: FileSink | null = null
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
    if (this.logSink === null) {
      this.pendingLines.push(formattedLine)
      return
    }

    if (this.pendingLines.length > 0) {
      this.flushPending()
    }

    this.writeLine(formattedLine)
  }

  attachTo(runFolder: string): void {
    if (this.logFilePath === null) {
      this.logFilePath = joinPath(runFolder, this.createLogFileName())
      const logFile = Bun.file(this.logFilePath)
      this.logSink = logFile.writer()
      this.logSink.start?.()
    }

    if (this.pendingLines.length > 0) {
      this.flushPending()
    }
  }

  private flushPending(): void {
    if (this.logSink === null || this.pendingLines.length === 0) {
      return
    }

    const writer = this.logSink
    const bufferedLines = this.pendingLines.splice(0)
    for (const line of bufferedLines) {
      writer.write(`${line}\n`)
    }
    this.safeFlush(writer.flush())
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
        return Bun.inspect(arg, { depth: Infinity, colors: false })
      })
      .join(" ")
  }

  private writeLine(line: string): void {
    if (this.logSink === null) {
      this.pendingLines.push(line)
      return
    }

    this.logSink.write(`${line}\n`)
    this.safeFlush(this.logSink.flush())
  }

  private safeFlush(result: number | Promise<number>): void {
    void Promise.resolve(result).catch(() => {})
  }
}

export class RunFolderLoggingObserver implements RunFolderObserver {
  constructor(private readonly logger: FileLogger) {}

  onRunFolderReady(runFolder: string): void {
    this.logger.attachTo(runFolder)
  }
}
