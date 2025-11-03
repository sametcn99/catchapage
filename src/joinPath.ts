export function joinPath(...segments: string[]): string {
  if (segments.length === 0) {
    return "."
  }

  const normalized = segments.map((segment, index) => {
    const sanitized = segment.replace(/\\/g, "/")
    if (index === 0) {
      return sanitized.replace(/\/+$/g, "")
    }

    return sanitized.replace(/^\/+|\/+$/g, "")
  })

  const result = normalized.filter((segment, index) => segment.length > 0 || index === 0).join("/")
  return result.replace(/\/+/g, "/")
}
