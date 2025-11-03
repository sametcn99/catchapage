export async function loadUrlsFromFile(filePath: string): Promise<string[]> {
  const file = Bun.file(filePath)

  if (!(await file.exists())) {
    throw new Error(`Links file not found: ${filePath}`)
  }

  const content = (await file.text()).trim()

  if (content.length === 0) {
    throw new Error(`Links file is empty: ${filePath}`)
  }

  const rawUrls = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (rawUrls.length === 0) {
    throw new Error(`Links file does not contain any URLs: ${filePath}`)
  }

  const invalid: string[] = []
  const normalizedUrls: string[] = []

  for (const rawUrl of rawUrls) {
    try {
      normalizedUrls.push(normalizeUrl(rawUrl))
    } catch {
      invalid.push(rawUrl)
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Links file contains invalid URLs: ${invalid.join(", ")}`)
  }

  return normalizedUrls

  function normalizeUrl(rawUrl: string): string {
    try {
      return new URL(rawUrl).toString()
    } catch {
      return new URL(`https://${rawUrl}`).toString()
    }
  }
}
