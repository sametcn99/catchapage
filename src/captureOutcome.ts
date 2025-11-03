export class CaptureOutcome {
  constructor(
    public readonly url: string,
    public readonly folder: string,
    public readonly success: boolean,
    public readonly error?: string,
  ) {}

  static ok(url: string, folder: string) {
    return new CaptureOutcome(url, folder, true)
  }

  static fail(url: string, folder: string, error: unknown) {
    return new CaptureOutcome(
      url,
      folder,
      false,
      error instanceof Error ? error.message : String(error),
    )
  }
}
