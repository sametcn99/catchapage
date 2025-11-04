import { z } from "zod"

export type ColorScheme = "dark" | "light" | "no-preference" | null | undefined

const stringFromEnv = (defaultValue: string) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.length === 0 ? defaultValue : value))

const numberFromEnv = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.length === 0) {
        return defaultValue
      }
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) {
        throw new Error(`Expected a number but received "${value}"`)
      }
      return parsed
    })

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.length === 0) {
        return defaultValue
      }
      if (value === "true") {
        return true
      }
      if (value === "false") {
        return false
      }
      throw new Error(`Expected "true" or "false" but received "${value}"`)
    })

const stringArrayFromEnv = (defaultValue: string[]) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim().length === 0) {
        return [...defaultValue]
      }
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    })

const colorSchemeFromEnv = (defaultValue: ColorScheme) =>
  z
    .string()
    .optional()
    .transform<ColorScheme>((value) => {
      if (value === undefined || value.trim().length === 0) {
        return defaultValue
      }
      const normalized = value.trim().toLowerCase()
      if (normalized === "null") {
        return null
      }
      if (normalized === "undefined") {
        return undefined
      }
      if (normalized === "dark" || normalized === "light" || normalized === "no-preference") {
        return normalized as ColorScheme
      }
      throw new Error(
        `Expected one of "dark", "light", "no-preference", "null" or "undefined" but received "${value}"`,
      )
    })

const configurationSchema = z.object({
  DEFAULT_OUTPUT_DIR: stringFromEnv("output"),
  LINKS_FILE: stringFromEnv("links.txt"),
  PARALLEL_CAPTURE_ENABLED: booleanFromEnv(true),
  DESKTOP_VIEWPORT_WIDTH: numberFromEnv(1280),
  DESKTOP_VIEWPORT_HEIGHT: numberFromEnv(720),
  DESKTOP_DEVICE_DESCRIPTOR: stringFromEnv("Desktop Chrome"),
  DESKTOP_SCREEN_WIDTH: numberFromEnv(1920),
  DESKTOP_SCREEN_HEIGHT: numberFromEnv(1080),
  DESKTOP_DEVICE_SCALE_FACTOR: numberFromEnv(1.5),
  DESKTOP_LOCALE: stringFromEnv("en-US"),
  DESKTOP_TIMEZONE_ID: stringFromEnv("Europe/Istanbul"),
  DESKTOP_COLOR_SCHEME: colorSchemeFromEnv("dark"),
  MOBILE_VIEWPORT_WIDTH: numberFromEnv(390),
  MOBILE_VIEWPORT_HEIGHT: numberFromEnv(844),
  MOBILE_DEVICE_DESCRIPTOR: stringFromEnv("Pixel 5"),
  MOBILE_SCREEN_WIDTH: numberFromEnv(1080),
  MOBILE_SCREEN_HEIGHT: numberFromEnv(2340),
  MOBILE_DEVICE_SCALE_FACTOR: numberFromEnv(3),
  MOBILE_LOCALE: stringFromEnv("en-US"),
  MOBILE_TIMEZONE_ID: stringFromEnv("America/Los_Angeles"),
  MOBILE_COLOR_SCHEME: colorSchemeFromEnv("dark"),
  TABLET_VIEWPORT_WIDTH: numberFromEnv(1024),
  TABLET_VIEWPORT_HEIGHT: numberFromEnv(1366),
  TABLET_DEVICE_DESCRIPTOR: stringFromEnv("iPad (gen 7)"),
  TABLET_SCREEN_WIDTH: numberFromEnv(1620),
  TABLET_SCREEN_HEIGHT: numberFromEnv(2160),
  TABLET_DEVICE_SCALE_FACTOR: numberFromEnv(2),
  TABLET_LOCALE: stringFromEnv("en-US"),
  TABLET_TIMEZONE_ID: stringFromEnv("America/Los_Angeles"),
  TABLET_COLOR_SCHEME: colorSchemeFromEnv("dark"),
  PRIMARY_NAVIGATION_TIMEOUT_MS: numberFromEnv(45000),
  FALLBACK_NAVIGATION_TIMEOUT_MS: numberFromEnv(60000),
  POST_NAVIGATION_IDLE_MS: numberFromEnv(1000),
  CAPTURE_STABILIZATION_DELAY_MS: numberFromEnv(2000),
  CONTENT_READY_TIMEOUT_MS: numberFromEnv(10000),
  CHROMIUM_HOST_RESOLVER_RULES: stringArrayFromEnv([]),
  CHROMIUM_USE_CUSTOM_DNS: booleanFromEnv(false),
  CHROMIUM_DNS_SERVERS: stringArrayFromEnv(["94.140.14.14", "94.140.14.15"]),
  DESKTOP_USER_AGENT: stringFromEnv(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ),
  DEFAULT_MOBILE_USER_AGENT: stringFromEnv(
    "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Mobile Safari/537.36",
  ),
  DEFAULT_TABLET_USER_AGENT: stringFromEnv(
    "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  ),
})

type ConfigurationShape = z.infer<typeof configurationSchema>

class RuntimeConfiguration {
  private static instance: RuntimeConfiguration | null = null

  public readonly DEFAULT_OUTPUT_DIR: string
  public readonly LINKS_FILE: string
  public readonly PARALLEL_CAPTURE_ENABLED: boolean
  public readonly DESKTOP_VIEWPORT: Readonly<{ width: number; height: number }>
  public readonly DESKTOP_DEVICE_DESCRIPTOR: string
  public readonly DESKTOP_SCREEN: Readonly<{ width: number; height: number }>
  public readonly DESKTOP_DEVICE_SCALE_FACTOR: number
  public readonly DESKTOP_LOCALE: string
  public readonly DESKTOP_TIMEZONE_ID: string
  public readonly DESKTOP_COLOR_SCHEME: ColorScheme
  public readonly MOBILE_VIEWPORT: Readonly<{ width: number; height: number }>
  public readonly MOBILE_DEVICE_DESCRIPTOR: string
  public readonly MOBILE_SCREEN: Readonly<{ width: number; height: number }>
  public readonly MOBILE_DEVICE_SCALE_FACTOR: number
  public readonly MOBILE_LOCALE: string
  public readonly MOBILE_TIMEZONE_ID: string
  public readonly MOBILE_COLOR_SCHEME: ColorScheme
  public readonly TABLET_VIEWPORT: Readonly<{ width: number; height: number }>
  public readonly TABLET_DEVICE_DESCRIPTOR: string
  public readonly TABLET_SCREEN: Readonly<{ width: number; height: number }>
  public readonly TABLET_DEVICE_SCALE_FACTOR: number
  public readonly TABLET_LOCALE: string
  public readonly TABLET_TIMEZONE_ID: string
  public readonly TABLET_COLOR_SCHEME: ColorScheme
  public readonly PRIMARY_NAVIGATION_TIMEOUT_MS: number
  public readonly FALLBACK_NAVIGATION_TIMEOUT_MS: number
  public readonly POST_NAVIGATION_IDLE_MS: number
  public readonly CAPTURE_STABILIZATION_DELAY_MS: number
  public readonly CONTENT_READY_TIMEOUT_MS: number
  public readonly CHROMIUM_HOST_RESOLVER_RULES: ReadonlyArray<string>
  public readonly CHROMIUM_USE_CUSTOM_DNS: boolean
  public readonly CHROMIUM_DNS_SERVERS: ReadonlyArray<string>
  public readonly DESKTOP_USER_AGENT: string
  public readonly DEFAULT_MOBILE_USER_AGENT: string
  public readonly DEFAULT_TABLET_USER_AGENT: string

  private constructor(values: ConfigurationShape) {
    this.DEFAULT_OUTPUT_DIR = values.DEFAULT_OUTPUT_DIR
    this.LINKS_FILE = values.LINKS_FILE
    this.PARALLEL_CAPTURE_ENABLED = values.PARALLEL_CAPTURE_ENABLED
    this.DESKTOP_VIEWPORT = Object.freeze({
      width: values.DESKTOP_VIEWPORT_WIDTH,
      height: values.DESKTOP_VIEWPORT_HEIGHT,
    })
    this.DESKTOP_DEVICE_DESCRIPTOR = values.DESKTOP_DEVICE_DESCRIPTOR
    this.DESKTOP_SCREEN = Object.freeze({
      width: values.DESKTOP_SCREEN_WIDTH,
      height: values.DESKTOP_SCREEN_HEIGHT,
    })
    this.DESKTOP_DEVICE_SCALE_FACTOR = values.DESKTOP_DEVICE_SCALE_FACTOR
    this.DESKTOP_LOCALE = values.DESKTOP_LOCALE
    this.DESKTOP_TIMEZONE_ID = values.DESKTOP_TIMEZONE_ID
    this.DESKTOP_COLOR_SCHEME = values.DESKTOP_COLOR_SCHEME
    this.MOBILE_VIEWPORT = Object.freeze({
      width: values.MOBILE_VIEWPORT_WIDTH,
      height: values.MOBILE_VIEWPORT_HEIGHT,
    })
    this.MOBILE_DEVICE_DESCRIPTOR = values.MOBILE_DEVICE_DESCRIPTOR
    this.MOBILE_SCREEN = Object.freeze({
      width: values.MOBILE_SCREEN_WIDTH,
      height: values.MOBILE_SCREEN_HEIGHT,
    })
    this.MOBILE_DEVICE_SCALE_FACTOR = values.MOBILE_DEVICE_SCALE_FACTOR
    this.MOBILE_LOCALE = values.MOBILE_LOCALE
    this.MOBILE_TIMEZONE_ID = values.MOBILE_TIMEZONE_ID
    this.MOBILE_COLOR_SCHEME = values.MOBILE_COLOR_SCHEME
    this.TABLET_VIEWPORT = Object.freeze({
      width: values.TABLET_VIEWPORT_WIDTH,
      height: values.TABLET_VIEWPORT_HEIGHT,
    })
    this.TABLET_DEVICE_DESCRIPTOR = values.TABLET_DEVICE_DESCRIPTOR
    this.TABLET_SCREEN = Object.freeze({
      width: values.TABLET_SCREEN_WIDTH,
      height: values.TABLET_SCREEN_HEIGHT,
    })
    this.TABLET_DEVICE_SCALE_FACTOR = values.TABLET_DEVICE_SCALE_FACTOR
    this.TABLET_LOCALE = values.TABLET_LOCALE
    this.TABLET_TIMEZONE_ID = values.TABLET_TIMEZONE_ID
    this.TABLET_COLOR_SCHEME = values.TABLET_COLOR_SCHEME
    this.PRIMARY_NAVIGATION_TIMEOUT_MS = values.PRIMARY_NAVIGATION_TIMEOUT_MS
    this.FALLBACK_NAVIGATION_TIMEOUT_MS = values.FALLBACK_NAVIGATION_TIMEOUT_MS
    this.POST_NAVIGATION_IDLE_MS = values.POST_NAVIGATION_IDLE_MS
    this.CAPTURE_STABILIZATION_DELAY_MS = values.CAPTURE_STABILIZATION_DELAY_MS
    this.CONTENT_READY_TIMEOUT_MS = values.CONTENT_READY_TIMEOUT_MS
    this.CHROMIUM_HOST_RESOLVER_RULES = Object.freeze([...values.CHROMIUM_HOST_RESOLVER_RULES])
    this.CHROMIUM_USE_CUSTOM_DNS = values.CHROMIUM_USE_CUSTOM_DNS
    this.CHROMIUM_DNS_SERVERS = Object.freeze([...values.CHROMIUM_DNS_SERVERS])
    this.DESKTOP_USER_AGENT = values.DESKTOP_USER_AGENT
    this.DEFAULT_MOBILE_USER_AGENT = values.DEFAULT_MOBILE_USER_AGENT
    this.DEFAULT_TABLET_USER_AGENT = values.DEFAULT_TABLET_USER_AGENT
  }

  public static load(): RuntimeConfiguration {
    if (!RuntimeConfiguration.instance) {
      const values = configurationSchema.parse(Bun.env)
      RuntimeConfiguration.instance = new RuntimeConfiguration(values)
    }
    return RuntimeConfiguration.instance
  }
}

const runtimeConfiguration = RuntimeConfiguration.load()

export type Config = Readonly<typeof runtimeConfiguration>

export const config: Config = runtimeConfiguration
