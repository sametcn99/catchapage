export const DEFAULT_OUTPUT_DIR = "output"
export const LINKS_FILE = "links.txt"

export const PARALLEL_CAPTURE_ENABLED = true

export const DESKTOP_VIEWPORT = { width: 1280, height: 720 }
export const DESKTOP_DEVICE_DESCRIPTOR = "Desktop Chrome"
export const DESKTOP_SCREEN = { width: 1920, height: 1080 }
export const DESKTOP_DEVICE_SCALE_FACTOR = 1.5
export const DESKTOP_LOCALE = "en-US"
export const DESKTOP_TIMEZONE_ID = "Europe/Istanbul"
export const DESKTOP_COLOR_SCHEME = "dark"

export const MOBILE_VIEWPORT = { width: 390, height: 844 }
export const MOBILE_DEVICE_DESCRIPTOR = "Pixel 5"
export const MOBILE_SCREEN = { width: 1080, height: 2340 }
export const MOBILE_DEVICE_SCALE_FACTOR = 3
export const MOBILE_LOCALE = "en-US"
export const MOBILE_TIMEZONE_ID = "America/Los_Angeles"
export const MOBILE_COLOR_SCHEME = "dark"

export const TABLET_VIEWPORT = { width: 1024, height: 1366 }
export const TABLET_DEVICE_DESCRIPTOR = "iPad (gen 7)"
export const TABLET_SCREEN = { width: 1620, height: 2160 }
export const TABLET_DEVICE_SCALE_FACTOR = 2
export const TABLET_LOCALE = "en-US"
export const TABLET_TIMEZONE_ID = "America/Los_Angeles"
export const TABLET_COLOR_SCHEME = "dark"

export const PRIMARY_NAVIGATION_TIMEOUT_MS = 45000
export const FALLBACK_NAVIGATION_TIMEOUT_MS = 60000
export const POST_NAVIGATION_IDLE_MS = 1000
export const CAPTURE_STABILIZATION_DELAY_MS = 2000
export const CONTENT_READY_TIMEOUT_MS = 10000

export const CHROMIUM_HOST_RESOLVER_RULES = Object.freeze<string[]>([])

export const CHROMIUM_USE_CUSTOM_DNS = false

export const CHROMIUM_DNS_SERVERS = Object.freeze(["94.140.14.14", "94.140.14.15"])

export const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
export const DEFAULT_MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Mobile Safari/537.36"
export const DEFAULT_TABLET_USER_AGENT =
  "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
